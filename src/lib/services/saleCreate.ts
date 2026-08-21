import { Sale, StockHistory, VariantStockHistory } from '../../types';
import { localDb, queueOp, generateId } from '../localDb';
import { getDeviceId } from '../deviceId';
import { getActor } from '../actionToken';
import { mapSale, toRemoteVariantStockHistory, toRemoteProduct, toRemoteCustomer, toRemoteSale, toRemoteStockHistory } from './mappers';
import { derivePaymentStatus } from './utils';
import { commitSaleAuthoritative, revertLocalSaleStock } from './atomicOps';
import { recordCustomerLedger } from './customersService';
import { collectSaleMovements } from './saleCreate.stock';
import { adjustPaymentBalances, buildSalePaymentMoves } from './paymentsService';
import { logAuditEvent } from './auditLogService';

export async function createSale(sale: Omit<Sale, 'id'>): Promise<Sale> {
  if (!sale.invoiceNumber || String(sale.invoiceNumber).trim() === '' || sale.invoiceNumber === 'undefined') {
    console.error("[FATAL] Attempted to create a sale without a valid invoiceNumber:", sale);
    throw new Error("Cannot create a sale without a valid invoice number. This prevents ghost records.");
  }
  const id = generateId();
  const now = new Date();
  const actor = getActor();
  // PHASE 27 / 2 / 6: every transaction carries a stable device id + idempotency
  // key for multi-device dedup, plus immutable attribution (who actually rang it
  // up) so edits can never silently reassign the salesman/cashier link.
  const newSale = {
    ...sale,
    id,
    deviceId: getDeviceId(),
    idempotencyKey: id,
    userId: actor?.id ?? null,
    actionPerformedBy: actor?.id ?? null,
    originalCashier: sale.cashier ?? null,
    originalSalesmanId: sale.salesmanId ?? null,
    originalSalesmanName: sale.salesmanName ?? null,
    timestamp: now,
    createdAt: now
  } as Sale;

  // We must process items FIRST to calculate true FIFO cost before saving the sale
  // DRAFT RULE: pending drafts must NEVER touch stock or revenue.
  // A draft is only a saved cart — it deducts stock ONLY when it is completed.
  // ESTORE RULE (2026-08-12): an online order has NO stock effect until the
  // POS bills it. Fulfilling (creating this sale with sourceOrderId) is the
  // bill — so stock IS deducted here, exactly once, via the normal sale path.
  const isDraftSale = sale.status === 'pending' || !!sale.notes?.includes('DRAFT_SALE');
  const skipStockEffects = isDraftSale;

  const { movements, historyQueue, anyOversold } = await collectSaleMovements(newSale, id, now, skipStockEffects);

  // 1. Local Write (Now contains precise purchaseCost per item)
  (newSale as any).paymentStatus = derivePaymentStatus(newSale);
  // NOTE: collectSaleMovements() above already adjusted local product stock +
  // wrote local stock_history. For ONLINE sales we enforce ALL-OR-NOTHING: if the
  // cloud commit fails we fully REVERT these local writes (see cloudFailedHard)
  // so local & cloud can never silently diverge. Offline sales stay local-first
  // and are queued for later sync (no divergence once reconnected).
  await localDb.sales.add(newSale);

  // 2. Atomic cloud commit (online) OR legacy per-op queue fallback (offline).
  // Commit the sale + ALL stock movements in ONE transaction via the `commit_sale`
  // RPC so products.stock / variant_data can NEVER diverge from sales. If the RPC
  // succeeds, the legacy 'sales' + 'stock_history' queue ops are skipped.
  const onlineNow = typeof navigator === 'undefined' || navigator.onLine;
  let cloudCommitted = false;
  let cloudFailedHard = false;
  if (onlineNow && !skipStockEffects && !isDraftSale) {
    const commitRes = await commitSaleAuthoritative(toRemoteSale(newSale), movements);
    if (commitRes && commitRes.already_fulfilled) {
      await revertLocalSaleStock(newSale.id, movements);
      cloudCommitted = true;
    } else if (commitRes) {
      cloudCommitted = true;
    } else {
      // ONLINE but cloud rejected/timed-out. ALL-OR-NOTHING: do NOT leave a
      // half-synced sale locally — revert every local write for this sale.
      cloudFailedHard = true;
    }
    // P26/P27: persist payment_status on the cloud sale row via the sync queue
    // (OFFLINE-FIRST compliant — never a direct supabase-js write).
    if (cloudCommitted) {
      try {
        await queueOp('sales', 'update', newSale.id, { payment_status: (newSale as any).paymentStatus } as any, { batchId: id });
      } catch (_) { /* non-fatal */ }
    }
  }

  // 2.1 ALL-OR-NOTHING ROLLBACK for online sales whose cloud commit failed.
  if (cloudFailedHard) {
    await revertLocalSaleStock(newSale.id, movements);
    await localDb.stockHistory.where('referenceId').equals(newSale.id).delete();
    await localDb.variantStockHistory.filter((h: any) => h.referenceId === newSale.id).delete();
    await localDb.sales.delete(newSale.id);
    throw new Error('SALE_NOT_SYNCED: Cloud unreachable — the sale was NOT saved (nothing changed locally). Retry when online.');
  }

  if (!cloudCommitted) {
    await queueOp('sales', 'create', id, toRemoteSale(newSale), { batchId: id });
    for (const q of historyQueue) {
      await queueOp(q.entity, 'create', q.histId, q.remote, q.opts);
    }
  }

  // 2.5. Record Payment Movements (Wallets)
  if (!isDraftSale) {
    const paymentMoves = buildSalePaymentMoves(newSale);
    await adjustPaymentBalances(paymentMoves, { batchId: id });
  }

  // 3. Update Customer Stats if identified (NEVER for drafts — drafts are not revenue)
  if (newSale.customerId && !isDraftSale) {
    const customer = await localDb.customers.get(newSale.customerId);
    if (customer) {
      const updatedCustomer = {
        ...customer,
        totalPurchases: (customer.totalPurchases || 0) + newSale.total,
        lastPurchase: newSale.timestamp,
        updatedAt: now
      };
      await localDb.customers.put(updatedCustomer);
      await queueOp('customers', 'update', customer.id, toRemoteCustomer(updatedCustomer), { batchId: id });
      // P6/P24: record customer ledger (local-first, synced via queueOp) + maintain balance.
      const balAfter = await recordCustomerLedger({
        customerId: customer.id,
        saleId: newSale.id,
        type: 'sale',
        debit: newSale.total,
        reference: newSale.invoiceNumber,
        note: 'Sale',
      });
      if (typeof balAfter === 'number') {
        await localDb.customers.update(customer.id, { balance: balAfter });
        await queueOp('customers', 'update', customer.id, toRemoteCustomer({ ...customer, balance: balAfter, updatedAt: now }), { batchId: id });
      }
    }
  }

  (newSale as any).wasOversold = anyOversold;

  // BUG-C06/C07: audit trail — every sale creation is logged locally + synced.
  await logAuditEvent({
    saleId: newSale.id,
    invoiceNumber: newSale.invoiceNumber,
    action: 'created',
    performedByName: (newSale as any).cashier,
    meta: { total: newSale.total, itemCount: newSale.items.length, deviceId: (newSale as any).deviceId },
  });

  return newSale;
}
