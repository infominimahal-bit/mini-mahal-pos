import { supabase } from '../supabase';
import { localDb, queueOp } from '../localDb';
import { toRemoteSale, toRemoteCustomer } from './mappers';
import { buildSaleStockMovements } from './saleStockMovements';
import { adjustPaymentBalances, buildReversePaymentMoves, buildSalePaymentMoves } from './paymentsService';
import { recordCustomerLedger } from './customersService';
import { createSale } from './saleCreate';
import { deleteSale } from './saleDelete';

// PHASE 5b — Atomic bill edit. Replaces the old two-call (create + delete)
// flow so stock can NEVER leak if one call fails independently. The cloud RPC
// inserts the new sale, deducts new stock, restores old stock, and hard-deletes
// the old sale in ONE transaction. Side effects (payment balances, customer
// stats/ledger) are applied here, AFTER the RPC succeeds.
export async function editSaleAtomic(oldSale: any, newSale: any, cashier: string): Promise<any> {
  const now = new Date();
  const isDraft = newSale.status === 'pending' || !!newSale.notes?.includes('DRAFT_SALE');

  const newMovements = await buildSaleStockMovements(newSale, false, newSale.invoiceNumber);
  const oldReverseMovements = await buildSaleStockMovements(oldSale, true, oldSale.invoiceNumber);

  const online = typeof navigator === 'undefined' || navigator.onLine;
  let committed = false;
  if (online) {
    const res = await supabase.rpc('edit_sale_atomic', {
      p_new_sale: toRemoteSale(newSale),
      p_new_history: newMovements,
      p_old_sale_id: oldSale.id,
      p_old_reverse_history: oldReverseMovements,
    });
    if (res.error) {
      console.error('[editSaleAtomic] RPC failed, falling back to a queued edit:', res.error);
    } else {
      committed = true;
    }
  }

  if (!committed) {
    // Offline / RPC failure: fall back to the existing reliable two-step flow.
    await createSale(newSale);
    await deleteSale(oldSale.id, cashier, { newInvoice: newSale.invoiceNumber });
    // deleteSale already reversed the OLD sale's wallet balances (refund-aware).
    // Apply the NEW sale's wallet balances so the drawer/wallet stays net-correct.
    if (!isDraft) {
      await adjustPaymentBalances(buildSalePaymentMoves(newSale));
    }
    return newSale;
  }

  // ---- Side effects (frontend, after atomic RPC success) ----
  // 1. Payment balances: reverse old (refund-aware, mirrors deleteSale), apply new.
  if (!isDraft) {
    const delRatio = oldSale.total > 0 ? (oldSale.total - (oldSale.refundedAmount || 0)) / oldSale.total : 0;
    await adjustPaymentBalances(buildReversePaymentMoves(oldSale, delRatio));
    await adjustPaymentBalances(buildSalePaymentMoves(newSale));
  }

  // 2. Customer stats + ledger: reverse old sale, apply new sale.
  if (newSale.customerId && !isDraft) {
    const customer = await localDb.customers.get(newSale.customerId);
    if (customer) {
      const oldNet = oldSale.total - (oldSale.refundedAmount || 0);
      const updatedCustomer = {
        ...customer,
        totalPurchases: Math.max(0, (customer.totalPurchases || 0) - oldNet + newSale.total),
        updatedAt: now,
      };
      await localDb.customers.put(updatedCustomer);
      await queueOp('customers', 'update', customer.id, toRemoteCustomer(updatedCustomer));
      const balAfter = await recordCustomerLedger({
        customerId: customer.id,
        saleId: oldSale.id,
        type: 'refund',
        credit: oldNet,
        reference: oldSale.invoiceNumber,
        note: 'Bill edit — reverse original',
      });
      if (typeof balAfter === 'number') {
        await localDb.customers.update(customer.id, { balance: balAfter });
        await queueOp('customers', 'update', customer.id, toRemoteCustomer({ ...customer, balance: balAfter, updatedAt: now }));
      }
      await recordCustomerLedger({
        customerId: customer.id,
        saleId: newSale.id,
        type: 'debit',
        debit: newSale.total,
        reference: newSale.invoiceNumber,
        note: 'Bill edit — new sale',
      });
    }
  }

  // 3. Local optimistic swap (cloud realtime will re-affirm stock = truth).
  await localDb.sales.delete(oldSale.id);
  await localDb.sales.put(newSale);
  const touch = async (m: any) => {
    const p = await localDb.products.get(m.product_id);
    if (p) await localDb.products.update(p.id, { stock: (p.stock || 0) + Number(m.change_qty), updatedAt: now });
  };
  for (const m of newMovements) await touch(m);
  for (const m of oldReverseMovements) await touch(m);

  return newSale;
}
