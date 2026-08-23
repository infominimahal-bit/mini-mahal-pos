import { RefundRequest, VariantStockHistory, Payment } from '../../types';
import { localDb, generateId } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { toRemoteProduct, toRemoteCustomer } from './mappers';
import { refundSaleAtomic, activeReturns } from './atomicOps';
import { adjustPaymentBalances, buildRefundPaymentMoves, toRemotePayment } from './paymentsService';
import { normalizePaymentMethod } from './utils';
import { recordCustomerLedger } from './customersService';
import { logAuditEvent } from './auditLogService';

export function calculateRefundAmount(sale: any, items: Array<{ index: number; qty: number }>): number {
  if (!items?.length) return 0;
  const sub = Number(sale.subtotal || 0);
  const disc = Number(sale.billDiscountAmount || sale.discountAmount || 0);
  const discRate = sub > 0 ? disc / sub : 0;
  let total = 0;
  for (const req of items) {
    const item = sale.items[req.index];
    if (!item) continue;
    const qty = Math.abs(Number(req.qty) || 0);
    if (!qty) continue;
    const itemSub = Number(item.subtotal || 0);
    const itemQty = Math.abs(Number(item.weight || item.quantity) || 1);
    const unitPrice = itemQty > 0 ? itemSub / itemQty : 0;
    total += unitPrice * (1 - discRate) * qty;
  }
  const taxRate = Number(sale.taxAmount || 0) && Number(sale.total || 0)
    ? Number(sale.taxAmount) / (Number(sale.total) - Number(sale.taxAmount)) : 0;
  return Math.round(total * (1 + taxRate) * 100) / 100;
}

export async function returnSale(id: string, request?: RefundRequest, currentCashierName?: string, overrideToken?: { p_user_id: string; p_role: string; p_sig: string } | null): Promise<void> {
  if (activeReturns.has(id)) {
    console.warn(`[returnSale] Duplicate call for ${id} ignored (already in progress).`);
    return;
  }
  const sale = await localDb.sales.get(id);
  if (!sale) throw new Error('Sale not found');
  // Already fully refunded → nothing left to reverse (also guards sequential re-calls)
  if (sale.status === 'refunded') {
    console.warn(`[returnSale] Sale ${id} already fully refunded — no-op.`);
    return;
  }

  activeReturns.add(id);
  try {
    const now = new Date();

    // Phase 1: collect reverse-stock movements for atomic cloud commit.
    const returnMovements: any[] = [];
    const localProductUpdates: any[] = [];
    const localStockHistoryAdds: any[] = [];
    const localVariantHistoryAdds: any[] = [];

    const isFullRefund = !request || request.type === 'full';
    const itemsToReverse = isFullRefund ? sale.items.map((item, index) => {
      const originalQty = item.weight || item.quantity;
      const alreadyRefunded = item.refundedQuantity || 0;
      return {
        index,
        productId: item.product.id,
        qty: Math.max(0, originalQty - alreadyRefunded),
        refundAmount: item.total || item.subtotal || 0
      };
    }) : (request?.items || []);

    let totalRefundAmount: number;
    if (isFullRefund) {
      totalRefundAmount = sale.total - (sale.refundedAmount || 0);
    } else {
      const calc = calculateRefundAmount(sale, itemsToReverse);
      totalRefundAmount = calc > 0 ? calc : (request?.totalRefundAmount || 0);
    }

    // R3 FIX: block over-refund BEFORE any local mutation so a repeated/partial
    // double-refund request can never restore stock or reverse payment twice.
    if ((sale.refundedAmount || 0) + totalRefundAmount > (sale.total || 0) + 0.01) {
      throw new Error('Refund amount exceeds remaining sale total — blocked to prevent double refund');
    }
    // 1. Reverse Stock Locally & Update Sale Items
    for (const reqItem of itemsToReverse) {
      if (Math.abs(Number(reqItem.qty) || 0) <= 0) continue;

      const item = sale.items[reqItem.index];
      if (!item) continue;

      // Update item's refunded quantity
      item.refundedQuantity = (item.refundedQuantity || 0) + Math.abs(Number(Math.abs(Number(reqItem.qty) || 0)) || 0);

      const product = await localDb.products.get(item.product.id);
      if (product && product.trackInventory) {
        const qty = Math.abs(Number(Math.abs(Number(reqItem.qty) || 0)) || 0);
        const newStock = (product.stock || 0) + qty;

        localProductUpdates.push({ id: product.id, data: { stock: newStock, updatedAt: now } });

        // Log Return in History (local cache) + movement for atomic cloud commit
        const retHistId = generateId();
        const retHistEntry = {
          id: retHistId,
          productId: product.id,
          changeQty: qty,
          type: 'return' as const,
          referenceId: id,
          balanceAfter: newStock,
          cashierName: currentCashierName || sale.cashier || 'System',
          createdAt: now
        };
        localStockHistoryAdds.push(retHistEntry);
        returnMovements.push({
          id: retHistId,
          product_id: product.id,
          change_qty: qty,
          type: 'return',
          note: `Sale #${sale.invoiceNumber} Refunded`,
          variant_id: '',
          variant_label: '',
          cashier_name: currentCashierName || sale.cashier || 'System',
        });

        // --- VARIANT-LEVEL STOCK RESTORATION (mirror of sale deduction) ---
        if (item.selectedVariantId && product.variantData) {
          const variant = product.variantData.find(v => v.id === item.selectedVariantId);
          if (variant) {
            const newVariantStock = (variant.stock || 0) + Math.abs(Number(reqItem.qty) || 0);
            const updatedVariantData = product.variantData.map(v =>
              v.id === variant.id ? { ...v, stock: newVariantStock } : v
            );
            localProductUpdates.push({ id: product.id, data: { variantData: updatedVariantData, updatedAt: now } });
            const vRetHistId = generateId();
            const vRetHistEntry: VariantStockHistory = {
              id: vRetHistId,
              productId: product.id,
              variantId: item.selectedVariantId,
              variantLabel: item.selectedVariantLabel || variant.cardTitle || variant.option1,
              changeQty: Math.abs(Number(reqItem.qty) || 0),
              type: 'return',
              referenceId: id,
              note: `Sale #${sale.invoiceNumber} Refunded (Variant)`,
              balanceAfter: newVariantStock,
              cashierName: currentCashierName || sale.cashier || 'System',
              createdAt: now
            };
            localVariantHistoryAdds.push(vRetHistEntry);
            returnMovements.push({
              id: vRetHistId,
              product_id: product.id,
              change_qty: Math.abs(Number(reqItem.qty) || 0),
              type: 'return',
              note: `Sale #${sale.invoiceNumber} Refunded (Variant)`,
              variant_id: item.selectedVariantId,
              variant_label: item.selectedVariantLabel || variant.cardTitle || variant.option1,
              cashier_name: currentCashierName || sale.cashier || 'System',
            });
          }
        }
      }

      // --- ADD-ON STOCK RESTORATION ---
      if (item.addonItems && item.addonItems.length > 0) {
        for (const addonItem of item.addonItems) {
          const addonProduct = await localDb.products.get(addonItem.addon.addonProductId);
          if (addonProduct && addonProduct.trackInventory) {
            const addonQtyToRestore = Math.abs(Number(reqItem.qty) || 0) * addonItem.quantity;
            if (addonQtyToRestore <= 0) continue;

            const newAddonStock = (addonProduct.stock || 0) + addonQtyToRestore;
            localProductUpdates.push({ id: addonProduct.id, data: { stock: newAddonStock, updatedAt: now } });
            // STRIP stock — cloud stock is updated ONLY via stock_history trigger (avoids double-count)
            const remoteRefundAddon = toRemoteProduct({ ...addonProduct, stock: newAddonStock, updatedAt: now });
            delete remoteRefundAddon.stock;
            await cloudWrite('products', 'update', addonProduct.id, remoteRefundAddon, { batchId: id });

            const aHistId = generateId();
            const aHistoryEntry = {
              id: aHistId,
              productId: addonProduct.id,
              changeQty: addonQtyToRestore,
              type: 'return' as const,
              referenceId: id,
              note: `Sale #${sale.invoiceNumber} Refunded (Add-on)`,
              balanceAfter: newAddonStock,
              cashierName: currentCashierName || sale.cashier || 'System',
              createdAt: now
            };
            localStockHistoryAdds.push(aHistoryEntry);
            returnMovements.push({
              id: aHistId,
              product_id: addonProduct.id,
              change_qty: addonQtyToRestore,
              type: 'return',
              note: `Sale #${sale.invoiceNumber} Refunded (Add-on)`,
              variant_id: '',
              variant_label: '',
              cashier_name: currentCashierName || sale.cashier || 'System',
            });
          }
        }
      }
    }

    // (stock + status are committed atomically further below, after finalStatus is known)
    // 1b. Restore FREE GIFTS stock on full refund (BUG-C09)
    if (isFullRefund && (sale as any).freeGifts?.length) {
      for (const gift of (sale as any).freeGifts) {
        const gp = await localDb.products.get((gift as any)?.product?.id);
        if (gp?.trackInventory) {
          const qty = Math.abs(Number((gift as any).quantity || 1));
          const newStock = (gp.stock || 0) + qty;
          localProductUpdates.push({ id: gp.id, data: { stock: newStock, updatedAt: now } });
          const hid = generateId();
          const he = {
            id: hid, productId: gp.id, changeQty: qty, type: 'return' as const,
            referenceId: id, note: `Sale #${sale.invoiceNumber} Refunded (Free Gift)`,
            balanceAfter: newStock, cashierName: currentCashierName || 'System', createdAt: now,
          };
          localStockHistoryAdds.push(he);
          returnMovements.push({ id: hid, product_id: gp.id, change_qty: qty, type: 'return',
            note: he.note, variant_id: '', variant_label: '', cashier_name: he.cashierName });
        }
      }
    }

    // 2. Update sale record
    const newRefundedAmount = (sale.refundedAmount || 0) + totalRefundAmount;

    // Reverse the proportional tax so tax liability stays accurate on partial/full refund (B2)
    const taxRatio = sale.total > 0 ? totalRefundAmount / sale.total : 0;
    const baseTax = Number(sale.taxAmount || 0);
    const newTaxAmount = Math.max(0, Math.round((baseTax - baseTax * taxRatio) * 100) / 100);

    // Check if fully refunded
    let allItemsFullyRefunded = true;
    for (const item of sale.items) {
      const totalQty = item.weight || item.quantity;
      if ((item.refundedQuantity || 0) < totalQty) {
        allItemsFullyRefunded = false;
        break;
      }
    }

    const finalStatus = allItemsFullyRefunded ? 'refunded' : 'partially_refunded';

    const returnUpdate = {
      ...sale,
      items: sale.items, // updated with refundedQuantity
      refundedAmount: newRefundedAmount,
      taxAmount: newTaxAmount,
      status: finalStatus as any,
      paymentStatus: finalStatus,
      updatedAt: now
    };

    await localDb.sales.put(returnUpdate); // use put instead of update to overwrite fully

    // 1b. Atomic cloud commit: reverse stock + update status in ONE tx (online).
    // Cloud-direct: no offline buffer. If the cloud commit fails we throw so the UI
    // shows a failure instead of silently keeping only the local optimistic state.
    const returnsCommitted = await refundSaleAtomic(id, returnMovements, finalStatus, newRefundedAmount, [], null, overrideToken);
    if (!returnsCommitted) {
      throw new Error('Cloud refund failed. Please retry — stock was not reversed.');
    }

    // Apply deferred local db updates
    for (const update of localProductUpdates) {
      await localDb.products.update(update.id, update.data);
    }
    for (const hist of localStockHistoryAdds) {
      await localDb.stockHistory.add(hist);
    }
    for (const vHist of localVariantHistoryAdds) {
      await localDb.variantStockHistory.add(vHist);
    }

    // Mirror sale status/payment_status to cloud (display cache sync).
    await cloudWrite('sales', 'update', id, { payment_status: finalStatus, status: finalStatus } as any, { batchId: id });

    // P6/P24: record refund on the customer ledger (credit reduces what they owe).
    const custId = (sale as any).customerId;
    if (custId) {
      await recordCustomerLedger({
        customerId: custId,
        saleId: id,
        type: 'refund',
        credit: totalRefundAmount,
        reference: (sale as any).invoiceNumber,
        note: 'Refund',
      });
    }

    // 4. Reverse Customer Stats
    if (sale.customerId && totalRefundAmount > 0) {
      const customer = await localDb.customers.get(sale.customerId);
      if (customer) {
        const ledgerRows = await localDb.customerLedger.where('customerId').equals(customer.id).toArray();
        const balAfter = ledgerRows.length ? Number((ledgerRows[ledgerRows.length - 1] as any).balanceAfter || 0) : (customer.balance || 0);
        const updatedCustomer = {
          ...customer,
          balance: balAfter,
          totalPurchases: (customer.totalPurchases || 0) - totalRefundAmount,
          updatedAt: now
        };
        await localDb.customers.put(updatedCustomer);
        await cloudWrite('customers', 'update', customer.id, toRemoteCustomer(updatedCustomer), { batchId: id });
      }
    }

    // 5. Create reversing payment record for audit trail
    if (totalRefundAmount > 0) {
      const refundWalletId = request?.method ? normalizePaymentMethod(request.method) : undefined;
      const refundMethod = refundWalletId
        || (sale.paymentMethod === 'split' ? 'cash' : (sale.paymentMethod || 'cash'));
      const refundPayId = generateId();
      const refundPayment: Payment = {
        id: refundPayId,
        customerId: sale.customerId || undefined,
        amount: totalRefundAmount,
        method: refundMethod,
        direction: 'out' as const,
        note: `${isFullRefund ? 'Full' : 'Partial'} Refund for sale ${sale.invoiceNumber || id}${request?.reason ? ` — ${request.reason}` : ''}`,
        createdAt: now,
      };
      await localDb.payments.add(refundPayment);
      await cloudWrite('payments', 'create', refundPayId, toRemotePayment(refundPayment), { batchId: id });
      // Refund wallet moves: same-wallet → reverse proportionally, different-wallet → deduct chosen only (BUG-C01/C08)
      const walletMoves = buildRefundPaymentMoves(sale, totalRefundAmount, refundWalletId);
      await adjustPaymentBalances(walletMoves, { batchId: id });
    }

    // BUG-C06: audit trail — every refund is logged locally + synced.
    await logAuditEvent({
      saleId: id,
      invoiceNumber: sale.invoiceNumber,
      action: isFullRefund ? 'refunded' : 'partially_refunded',
      performedByName: currentCashierName || (sale as any).cashier || 'System',
      meta: { refundAmount: totalRefundAmount, refundWallet: request?.method },
    });
  } finally {
    activeReturns.delete(id);
  }
}
