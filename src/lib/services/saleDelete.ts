import { Product } from '../../types';
import { localDb, generateId } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { toRemoteProduct, toRemoteCustomer } from './mappers';
import { deleteSaleAtomic } from './atomicOps';
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
  // `delete_sale_atomic` (no per-op queue → no divergence on deletes/returns).
  const returnMovements: any[] = [];
  const localProductUpdates: any[] = [];
  const localStockHistoryAdds: any[] = [];
  const localVariantHistoryAdds: any[] = [];

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

        // Defer Local Product update
        localProductUpdates.push({ id: product.id, data: { stock: newStock, updatedAt: now } });
        const updatedProduct = { ...product, stock: newStock, updatedAt: now };
        affectedProducts.push(updatedProduct);

        // Mirror product to cloud (cloud stock itself is updated by the stock_history trigger below)
        const remoteDeleteProduct = toRemoteProduct(updatedProduct);
        delete remoteDeleteProduct.stock;
        await cloudWrite('products', 'update', product.id, remoteDeleteProduct);

        // Log stock restoration as 'return' (delete is treated same as return for stock)
        const histId = generateId();
        const histType = qty < 0 ? 'sale' : 'return';
        const historyEntry = {
          id: histId,
          productId: product.id,
          changeQty: qty,
          type: histType as any,
          referenceId: id,
          note: `Sale #${sale.invoiceNumber} Deleted${editTag}`,
          balanceAfter: newStock,
          cashierName: currentCashierName || sale.cashier || 'System',
          createdAt: now
        };
        localStockHistoryAdds.push(historyEntry);
        returnMovements.push({
          id: histId,
          product_id: product.id,
          change_qty: qty,
          type: histType,
          note: `Sale #${sale.invoiceNumber} Deleted${editTag}`,
          variant_id: '',
          variant_label: '',
          cashier_name: currentCashierName || sale.cashier || 'System',
        });

        // --- VARIANT-LEVEL STOCK RESTORATION (mirror of sale deduction; cloud handled by variant trigger) ---
        if (item.selectedVariantId && product.variantData) {
          const variant = product.variantData.find(v => v.id === item.selectedVariantId);
          if (variant) {
            const newVariantStock = (variant.stock || 0) + qty;
            const updatedVariantData = product.variantData.map(v =>
              v.id === variant.id ? { ...v, stock: newVariantStock } : v
            );
            localProductUpdates.push({ id: product.id, data: { variantData: updatedVariantData, updatedAt: now } });
            const vHistId = generateId();
            const vHistEntry: any = {
              id: vHistId,
              productId: product.id,
              variantId: item.selectedVariantId,
              variantLabel: item.selectedVariantLabel || variant.cardTitle || variant.option1,
              changeQty: qty,
              type: histType as any,
              referenceId: id,
              note: `Sale #${sale.invoiceNumber} Deleted (Variant)${editTag}`,
              balanceAfter: newVariantStock,
              cashierName: currentCashierName || sale.cashier || 'System',
              createdAt: now
            };
            localVariantHistoryAdds.push(vHistEntry);
            returnMovements.push({
              id: vHistId,
              product_id: product.id,
              change_qty: qty,
              type: histType,
              note: `Sale #${sale.invoiceNumber} Deleted (Variant)${editTag}`,
              variant_id: item.selectedVariantId,
              variant_label: item.selectedVariantLabel || variant.cardTitle || variant.option1,
              cashier_name: currentCashierName || sale.cashier || 'System',
            });
          }
        }

        // --- ADD-ON STOCK RESTORATION ---
        if (item.addonItems && item.addonItems.length > 0) {
          for (const addonItem of item.addonItems) {
            const addonProduct = await localDb.products.get(addonItem.addon.addonProductId);
            if (addonProduct && addonProduct.trackInventory) {
              const addonQty = addonItem.quantity * qty; // qty retains the sign!
              if (Math.abs(addonQty) <= 0) continue;

              const newAddonStock = (addonProduct.stock || 0) + addonQty;

              localProductUpdates.push({ id: addonProduct.id, data: { stock: newAddonStock, updatedAt: now } });
              const updatedAddonProduct = { ...addonProduct, stock: newAddonStock, updatedAt: now };
              affectedProducts.push(updatedAddonProduct);
              // STRIP stock — cloud stock is updated ONLY via stock_history trigger (avoids double-count)
              const remoteDeleteAddon = toRemoteProduct(updatedAddonProduct);
              delete remoteDeleteAddon.stock;
              await cloudWrite('products', 'update', addonProduct.id, remoteDeleteAddon);

              const aHistType = addonQty < 0 ? 'sale' : 'return';
              const aHistId = generateId();
              const aHistoryEntry = {
                id: aHistId,
                productId: addonProduct.id,
                changeQty: addonQty,
                type: aHistType as any,
                referenceId: id,
                 note: `Sale #${sale.invoiceNumber} Deleted (Add-on)${editTag}`,
                balanceAfter: newAddonStock,
                cashierName: currentCashierName || sale.cashier || 'System',
                createdAt: now
              };
              localStockHistoryAdds.push(aHistoryEntry);
              returnMovements.push({
                id: aHistId,
                product_id: addonProduct.id,
                change_qty: addonQty,
                type: aHistType,
                note: `Sale #${sale.invoiceNumber} Deleted (Add-on)${editTag}`,
                variant_id: '',
                variant_label: '',
                cashier_name: currentCashierName || sale.cashier || 'System',
              });
            }
          }
        }
      } else if (product) {
        affectedProducts.push(product);
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
        localProductUpdates.push({ id: gp.id, data: { stock: newStock, updatedAt: now } });
        const hid = generateId();
        const he = {
          id: hid, productId: gp.id, changeQty: qty, type: 'return' as const,
          referenceId: id, note: `Sale #${sale.invoiceNumber} Deleted (Free Gift)${editTag}`,
          balanceAfter: newStock, cashierName: currentCashierName || sale.cashier || 'System', createdAt: now,
        };
        localStockHistoryAdds.push(he);
        returnMovements.push({ id: hid, product_id: gp.id, change_qty: qty, type: 'return',
          note: he.note, variant_id: '', variant_label: '', cashier_name: he.cashierName });
      }
    }
  }

  // 1b. Atomic cloud commit: reverse stock + hard-delete sale in ONE tx (online).
  // Cloud-direct: no offline buffer. If the cloud commit fails we throw so the
  // caller learns immediately instead of keeping a half-deleted local state.
  const deleteCommitted = await deleteSaleAtomic(id, returnMovements);
  if (!deleteCommitted) {
    throw new Error('Cloud delete failed. Please retry — stock was not reversed.');
  }

  // 1b2. Execute deferred local DB updates now that cloud succeeded
  for (const update of localProductUpdates) {
    await localDb.products.update(update.id, update.data);
  }
  for (const hist of localStockHistoryAdds) {
    await localDb.stockHistory.add(hist);
  }
  for (const vHist of localVariantHistoryAdds) {
    await localDb.variantStockHistory.add(vHist);
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
      await cloudWrite('customers', 'update', customer.id, toRemoteCustomer(updatedCustomer));
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
        await cloudWrite('customers', 'update', customer.id, toRemoteCustomer({ ...customer, balance: balAfter, updatedAt: now }));
      }
    }
  }

  return affectedProducts;
}
