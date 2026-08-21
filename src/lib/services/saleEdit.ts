import { supabase } from '../supabase';
import { localDb, queueOp } from '../localDb';
import { signAction } from '../actionToken';
import { toRemoteSale, toRemoteCustomer } from './mappers';
import { buildSaleStockMovements } from './saleStockMovements';
import { adjustPaymentBalances, buildReversePaymentMoves, buildSalePaymentMoves } from './paymentsService';
import { recordCustomerLedger } from './customersService';
import { createSale } from './saleCreate';
import { deleteSale } from './saleDelete';
import { logAuditEvent } from './auditLogService';

// PHASE 5b — Atomic bill edit. Replaces the old two-call (create + delete)
// flow so stock can NEVER leak if one call fails independently. The cloud RPC
// inserts the new sale, deducts new stock, restores old stock, and hard-deletes
// the old sale in ONE transaction. Side effects (payment balances, customer
// stats/ledger) are applied here, AFTER the RPC succeeds.
export async function editSaleAtomic(oldSale: any, newSale: any, cashier: string): Promise<any> {
  const now = new Date();
  // BUG-C05/C13: salesman is IMMUTABLE — always carry forward from the original sale.
  const oldSaleLocal = await localDb.sales.get(oldSale.id);
  if (!oldSaleLocal) throw new Error(`Old sale not found: ${oldSale.id}`);
  newSale.salesmanId = (oldSaleLocal as any).salesmanId || newSale.salesmanId;
  newSale.salesmanName = (oldSaleLocal as any).salesmanName || newSale.salesmanName;
  // PHASE 2/6: original cashier is IMMUTABLE — never overwrite with the acting
  // editor. The editor is recorded separately via lastEditedBy + audit trail.
  newSale.cashier = (oldSaleLocal as any).cashier || newSale.cashier;
  (newSale as any).originalSalesmanId = (oldSaleLocal as any).salesmanId;
  (newSale as any).originalSalesmanName = (oldSaleLocal as any).salesmanName;
  (newSale as any).originalCashier = (oldSaleLocal as any).cashier;
  (newSale as any).actionPerformedBy = cashier;
  (newSale as any).lastEditedBy = cashier;
  (newSale as any).lastEditedAt = now;
  (newSale as any).editCount = ((oldSaleLocal as any).editCount || 0) + 1;

  const isDraft = newSale.status === 'pending' || !!newSale.notes?.includes('DRAFT_SALE');

  const newMovements = await buildSaleStockMovements(newSale, false, newSale.invoiceNumber);
  const oldReverseMovements = await buildSaleStockMovements(oldSale, true, oldSale.invoiceNumber);

  const online = typeof navigator === 'undefined' || navigator.onLine;
  let committed = false;
  if (online) {
    const token = await signAction('edit_sale');
    const rpcPayload: any = {
      p_new_sale: toRemoteSale(newSale),
      p_new_history: newMovements,
      p_old_sale_id: oldSale.id,
      p_old_reverse_history: oldReverseMovements,
    };
    // PHASE 39A: server-side role enforcement (admin|manager). Always pass the
    // token params (null when no actor) so the call hits the guarded 7-arg
    // overload — never the legacy unguarded 4-arg one (which was dropped).
    rpcPayload.p_user_id = token?.p_user_id ?? null;
    rpcPayload.p_role = token?.p_role ?? null;
    rpcPayload.p_sig = token?.p_sig ?? null;
    const res = await supabase.rpc('edit_sale_atomic', rpcPayload);
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
        totalPurchases: (customer.totalPurchases || 0) - oldNet + newSale.total,
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

  // BUG-C06 / PHASE 4+33: audit trail — every bill edit is logged locally + synced.
  // Generic 'edited' event PLUS granular events so each change type is traceable.
  await logAuditEvent({
    saleId: newSale.id,
    invoiceNumber: newSale.invoiceNumber,
    action: 'edited',
    performedByName: cashier,
    meta: { oldSaleId: oldSale.id, oldInvoice: oldSale.invoiceNumber, newTotal: newSale.total, salesmanName: (oldSale as any).salesmanName },
  });
  const keyOf = (it: any) => it?.id || it?.product?.id;
  const oldItems = (oldSale as any).items || [];
  const newItems = (newSale as any).items || [];
  const oldKeys = new Set(oldItems.map(keyOf));
  const newKeys = new Set(newItems.map(keyOf));
  for (const it of oldItems) {
    if (!newKeys.has(keyOf(it))) {
      await logAuditEvent({ saleId: newSale.id, invoiceNumber: newSale.invoiceNumber, action: 'item_removed', performedByName: cashier, meta: { product: it?.product?.name, qty: it?.weight || it?.quantity } });
    }
  }
  for (const it of newItems) {
    if (!oldKeys.has(keyOf(it))) {
      await logAuditEvent({ saleId: newSale.id, invoiceNumber: newSale.invoiceNumber, action: 'item_added', performedByName: cashier, meta: { product: it?.product?.name, qty: it?.weight || it?.quantity } });
    }
  }
  if (Math.abs(((oldSale as any).discount_amount || 0) - (newSale as any).discount_amount) > 0.001) {
    await logAuditEvent({ saleId: newSale.id, invoiceNumber: newSale.invoiceNumber, action: 'discount_changed', performedByName: cashier, meta: { from: (oldSale as any).discount_amount, to: (newSale as any).discount_amount } });
  }
  if (((oldSale as any).paymentMethod || '') !== (newSale as any).paymentMethod || JSON.stringify((oldSale as any).splitPayments) !== JSON.stringify((newSale as any).splitPayments)) {
    await logAuditEvent({ saleId: newSale.id, invoiceNumber: newSale.invoiceNumber, action: 'payment_changed', performedByName: cashier, meta: { from: (oldSale as any).paymentMethod, to: (newSale as any).paymentMethod, fromSplit: (oldSale as any).splitPayments, toSplit: (newSale as any).splitPayments } });
  }
  for (const it of newItems) {
    const oi = oldItems.find((x: any) => keyOf(x) === keyOf(it));
    if (oi && Math.abs(((oi.price || oi.subtotal) || 0) - ((it.price || it.subtotal) || 0)) > 0.001) {
      await logAuditEvent({ saleId: newSale.id, invoiceNumber: newSale.invoiceNumber, action: 'price_changed', performedByName: cashier, meta: { product: it?.product?.name, from: oi.price || oi.subtotal, to: it.price || it.subtotal } });
    }
  }
  const touch = async (m: any) => {
    const p = await localDb.products.get(m.product_id);
    if (p) await localDb.products.update(p.id, { stock: (p.stock || 0) + Number(m.change_qty), updatedAt: now });
  };
  for (const m of newMovements) await touch(m);
  for (const m of oldReverseMovements) await touch(m);

  return newSale;
}
