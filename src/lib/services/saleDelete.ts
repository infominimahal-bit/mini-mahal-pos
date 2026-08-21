import { Product } from '../../types';
import { localDb, queueOp, generateId } from '../localDb';
import { toRemoteProduct, toRemoteCustomer, toRemoteStockHistory, toRemoteVariantStockHistory } from './mappers';
import { deleteSaleAtomic, applyStockMovementsRemote } from './atomicOps';
import { adjustPaymentBalances, buildReversePaymentMoves } from './paymentsService';
import { recordCustomerLedger } from './customersService';
import { logAuditEvent } from './auditLogService';

export async function deleteSale(id: string, currentCashierName?: string, editInfo?: { newInvoice?: string }): Promise<Product[]> {
  const sale = await localDb.sales.get(id);
  if (!sale) return [];

  // BUG-C14: already-deleted sale → just purge locally, no double stock/wallet reversal.
  if (sale.status === 'deleted') {
    await localDb.sales.delete(id);
    return [];
  }

  // Pre-fetch this sale's stock history so we can make the reversal IDEMPOTENT:
  // only restore the portion of each item that has NOT already been returned
  // (via refund or a prior delete). Prevents double stock restoration for
  // refunded/partially-refunded sales, while still fixing anomalies where a sale
  // (e.g. a negative-total return sale) was never reversed at all.
  const saleHistory = await localDb.stockHistory.where('referenceId').equals(id).toArray();

  const now = new Date();
  // When this delete is the "reverse original bill" half of a TWO-PHASE EDIT,
  // tag the restored-stock movements so the product history can show them as
  // an "edit" (not a plain delete) and link back to the corrected invoice.
  const editTag = editInfo && editInfo.newInvoice ? ` (Edit → #${editInfo.newInvoice})` : '';
  const affectedProducts: Product[] = [];

  // Phase 1: collect reverse-stock movements so they commit atomically via
  // `apply_stock_movements` (no per-op queue → no divergence on deletes/returns).
  const returnMovements: any[] = [];
  const returnQueue: Array<{ entity: string; histId: string; remote: any; opts: any }> = [];

  // 1. Reverse Stock (Only restore what has not been refunded/returned yet)
  // Pending drafts never deducted stock initially, so we don't restore it.
  // DRAFT RULE: BUG-C14 — drafts ('DRAFT_SALE' notes) never deducted stock, so
  // deleting one must NOT restore anything. status='pending' is a CREDIT sale
  // (real stock taken) and must still be reversed — so it is NOT a draft here.
  const isDraftSale = !!sale.notes?.includes('DRAFT_SALE');
  if (!isDraftSale) {
    for (const item of sale.items) {
      const product = await localDb.products.get(item.product.id);
      if (product && product.trackInventory) {
        // IDEMPOTENT REVERSAL: only restore what hasn't already been returned.
        // `reversedQty` = sum of existing 'return' entries for this sale+product.
        const rawQty = Number(item.weight || item.quantity) || 0;
        const sign = rawQty < 0 ? -1 : 1;
        const grossQty = Math.abs(rawQty);
        
        // Prevent double-deletion reversals by checking if a 'Deleted' entry already exists
        const alreadyDeleted = saleHistory.some(h => h.productId === product.id && h.note?.includes('Deleted'));
        if (alreadyDeleted) continue;

        // Use item.refundedQuantity to determine how many items were already partially refunded
        const reversedQty = Number(item.refundedQuantity) || 0;
        const netQtyMag = Math.max(0, grossQty - reversedQty);
        const qty = netQtyMag * sign;
        const itemQtyMag = netQtyMag;
        if (netQtyMag <= 0) continue;
        const newStock = (product.stock || 0) + qty;

        // Update Local Product
        await localDb.products.update(product.id, {
          stock: newStock,
          updatedAt: now
        });
        const updatedProduct = { ...product, stock: newStock, updatedAt: now };
        affectedProducts.push(updatedProduct);

        // Queue Product Sync — STRIP stock: cloud stock is updated ONLY via stock_history trigger
        // (absolute stock here would double-count with the trigger on the history insert below)
        const remoteDeleteProduct = toRemoteProduct(updatedProduct);
        delete remoteDeleteProduct.stock;
        await queueOp('products', 'update', product.id, remoteDeleteProduct);

        // Log stock restoration as 'return' (delete is treated same as return for stock)
        const histId = generateId();
        const historyEntry = {
          id: histId,
          productId: product.id,
          changeQty: qty,
          type: 'return' as const,
          referenceId: id,
          note: `Sale #${sale.invoiceNumber} Deleted${editTag}`,
          balanceAfter: newStock,
          cashierName: currentCashierName || sale.cashier || 'System',
          createdAt: now
        };
        await localDb.stockHistory.add(historyEntry);
        returnMovements.push({
          id: histId,
          product_id: product.id,
          change_qty: qty,
          type: 'return',
          note: `Sale #${sale.invoiceNumber} Deleted${editTag}`,
          variant_id: '',
          variant_label: '',
          cashier_name: currentCashierName || sale.cashier || 'System',
        });
        returnQueue.push({ entity: 'stock_history', histId, remote: toRemoteStockHistory(historyEntry), opts: undefined });

        // --- VARIANT-LEVEL STOCK RESTORATION (mirror of sale deduction; cloud handled by variant trigger) ---
        if (item.selectedVariantId && product.variantData) {
          const variant = product.variantData.find(v => v.id === item.selectedVariantId);
          if (variant) {
            const newVariantStock = (variant.stock || 0) + qty;
            const updatedVariantData = product.variantData.map(v =>
              v.id === variant.id ? { ...v, stock: newVariantStock } : v
            );
            await localDb.products.update(product.id, {
              variantData: updatedVariantData,
              updatedAt: now
            });
            const vHistId = generateId();
            const vHistEntry: any = {
              id: vHistId,
              productId: product.id,
              variantId: item.selectedVariantId,
              variantLabel: item.selectedVariantLabel || variant.cardTitle || variant.option1,
              changeQty: qty,
              type: 'return',
              referenceId: id,
              note: `Sale #${sale.invoiceNumber} Deleted (Variant)${editTag}`,
              balanceAfter: newVariantStock,
              cashierName: currentCashierName || sale.cashier || 'System',
              createdAt: now,
            };
            await localDb.variantStockHistory.add(vHistEntry);
            returnMovements.push({
              id: vHistId,
              product_id: product.id,
              change_qty: qty,
              type: 'return',
              note: `Sale #${sale.invoiceNumber} Deleted (Variant)${editTag}`,
              variant_id: item.selectedVariantId,
              variant_label: item.selectedVariantLabel || variant.cardTitle || variant.option1,
              cashier_name: currentCashierName || sale.cashier || 'System',
            });
            returnQueue.push({ entity: 'variant_stock_history', histId: vHistId, remote: toRemoteVariantStockHistory(vHistEntry), opts: undefined });
          }
        }
      } else if (product) {
        affectedProducts.push(product);
      }

      // --- ADD-ON STOCK RESTORATION ---
      if (item.addonItems && item.addonItems.length > 0) {
        for (const addonItem of item.addonItems) {
          const addonProduct = await localDb.products.get(addonItem.addon.addonProductId);
          if (addonProduct && addonProduct.trackInventory) {
            const addonQty = addonItem.quantity * qty; // qty retains the sign!
            if (Math.abs(addonQty) <= 0) continue;

            const newAddonStock = (addonProduct.stock || 0) + addonQty;

            await localDb.products.update(addonProduct.id, {
              stock: newAddonStock,
              updatedAt: now
            });
            const updatedAddonProduct = { ...addonProduct, stock: newAddonStock, updatedAt: now };
            affectedProducts.push(updatedAddonProduct);
            // STRIP stock — cloud stock is updated ONLY via stock_history trigger (avoids double-count)
            const remoteDeleteAddon = toRemoteProduct(updatedAddonProduct);
            delete remoteDeleteAddon.stock;
            await queueOp('products', 'update', addonProduct.id, remoteDeleteAddon);

            const aHistId = generateId();
            const aHistoryEntry = {
              id: aHistId,
              productId: addonProduct.id,
              changeQty: addonQty,
              type: 'return' as const,
              referenceId: id,
               note: `Sale #${sale.invoiceNumber} Deleted (Add-on)${editTag}`,
              balanceAfter: newAddonStock,
              cashierName: currentCashierName || sale.cashier || 'System',
              createdAt: now
            };
            await localDb.stockHistory.add(aHistoryEntry);
            returnMovements.push({
              id: aHistId,
              product_id: addonProduct.id,
              change_qty: addonQty,
              type: 'return',
               note: `Sale #${sale.invoiceNumber} Deleted (Add-on)${editTag}`,
              variant_id: '',
              variant_label: '',
              cashier_name: currentCashierName || sale.cashier || 'System',
            });
            returnQueue.push({ entity: 'stock_history', histId: aHistId, remote: toRemoteStockHistory(aHistoryEntry), opts: undefined });
          }
        }
      }
    }
  }

  // 1a. Restore FREE GIFTS stock on delete (BUG-C09)
  if (!isDraftSale && (sale as any).freeGifts?.length) {
    for (const gift of (sale as any).freeGifts) {
      const gp = await localDb.products.get((gift as any)?.product?.id);
      if (gp?.trackInventory) {
        const qty = Math.abs(Number((gift as any).quantity || 1));
        const newStock = (gp.stock || 0) + qty;
        await localDb.products.update(gp.id, { stock: newStock, updatedAt: now });
        const hid = generateId();
        const he = {
          id: hid, productId: gp.id, changeQty: qty, type: 'return' as const,
          referenceId: id, note: `Sale #${sale.invoiceNumber} Deleted (Free Gift)${editTag}`,
          balanceAfter: newStock, cashierName: currentCashierName || sale.cashier || 'System', createdAt: now,
        };
        await localDb.stockHistory.add(he);
        returnMovements.push({ id: hid, product_id: gp.id, change_qty: qty, type: 'return',
          note: he.note, variant_id: '', variant_label: '', cashier_name: he.cashierName });
        returnQueue.push({ entity: 'stock_history', histId: hid, remote: toRemoteStockHistory(he), opts: undefined });
      }
    }
  }

  // 1b. Atomic cloud commit: reverse stock + hard-delete sale in ONE tx (online).
  const onlineDel = typeof navigator === 'undefined' || navigator.onLine;
  let deleteCommitted = false;
  if (onlineDel) {
    deleteCommitted = await deleteSaleAtomic(id, returnMovements);
  }
  if (deleteCommitted) {
    // Sale hard-deleted via delete_sale_atomic (row_tombstone). payment_status is moot.
  }
  if (!deleteCommitted) {
    // Fallback: reverse stock via RPC-or-queue, then queue the sale hard-delete.
    if (returnMovements.length > 0) {
      const stockOk = await applyStockMovementsRemote(returnMovements);
      if (!stockOk) {
        for (const q of returnQueue) {
          await queueOp(q.entity, 'create', q.histId, q.remote, q.opts);
        }
      }
    }
    await queueOp('sales', 'delete', id, { history: returnMovements });
  }

  // 1c. Reverse wallet balances for the un-refunded portion (split-aware)
  // BUG-C14: credit sales did NOT debit a wallet, so never reverse a wallet for them.
  const walletWasDebited = sale.paymentMethod !== 'credit' && !isDraftSale;
  if (walletWasDebited && !['deleted', 'refunded'].includes(sale.status || '')) {
    const delRatio = sale.total > 0 ? (sale.total - (sale.refundedAmount || 0)) / sale.total : 0;
    await adjustPaymentBalances(buildReversePaymentMoves(sale, delRatio), { batchId: id });
  }

  // 2. Hard-Delete: Permanently remove from local database
  await localDb.sales.delete(id);

  // BUG-C06: audit trail — every sale deletion is logged locally + synced.
  await logAuditEvent({
    saleId: id,
    invoiceNumber: sale.invoiceNumber,
    action: 'deleted',
    performedByName: currentCashierName || (sale as any).cashier || 'System',
    meta: { total: sale.total, salesmanName: (sale as any).salesmanName },
  });

  // 4. Reverse Customer Credit/Stats if it was a credit sale (Only if not already deleted)
  //    Drafts never touched customer stats, so they must not be reversed either.
  if (sale.customerId && sale.status !== 'deleted' && !isDraftSale) {
    const customer = await localDb.customers.get(sale.customerId);
    if (customer) {
      const remainingTotal = sale.total - (sale.refundedAmount || 0);
      const updatedCustomer = {
        ...customer,
        totalPurchases: (customer.totalPurchases || 0) - remainingTotal,
        updatedAt: now
      };
      await localDb.customers.put(updatedCustomer);
      await queueOp('customers', 'update', customer.id, toRemoteCustomer(updatedCustomer));
      // P3/GAP3: reverse the original ledger debit so the ledger net is correct
      // (credit the un-refunded remainder; the refunded portion was already credited on refund).
      const balAfter = await recordCustomerLedger({
        customerId: customer.id,
        saleId: id,
        type: 'refund',
        credit: remainingTotal,
        reference: sale.invoiceNumber,
        note: 'Sale deleted/reversed',
      });
      if (typeof balAfter === 'number') {
        await localDb.customers.update(customer.id, { balance: balAfter });
        await queueOp('customers', 'update', customer.id, toRemoteCustomer({ ...customer, balance: balAfter, updatedAt: now }));
      }
    }
  }

  return affectedProducts;
}
