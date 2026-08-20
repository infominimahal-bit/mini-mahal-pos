import { Sale, RefundRequest, StockHistory, VariantStockHistory, Payment } from '../../types';
import { localDb, queueOp, generateId } from '../localDb';
import { toRemoteProduct, toRemoteCustomer, toRemoteSale, toRemoteStockHistory, toRemoteVariantStockHistory } from './mappers';
import { refundSaleAtomic, applyStockMovementsRemote, activeReturns } from './atomicOps';
import { adjustPaymentBalances, buildReversePaymentMoves, toRemotePayment } from './paymentsService';
import { recordCustomerLedger } from './customersService';

export async function returnSale(id: string, request?: RefundRequest, currentCashierName?: string): Promise<void> {
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
    const returnQueue: Array<{ entity: string; histId: string; remote: any; opts: any }> = [];

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

    const totalRefundAmount = isFullRefund ? sale.total : (request?.totalRefundAmount || 0);

    // R3 FIX: block over-refund BEFORE any local mutation so a repeated/partial
    // double-refund request can never restore stock or reverse payment twice.
    // (The cloud RPC also guards this, but local-first restore must be pre-checked.)
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

        await localDb.products.update(product.id, {
          stock: newStock,
          updatedAt: now
        });

        // Log Return in History + Queue cloud sync
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
        await localDb.stockHistory.add(retHistEntry);
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
        returnQueue.push({ entity: 'stock_history', histId: retHistId, remote: toRemoteStockHistory(retHistEntry), opts: { batchId: id } });

        // --- VARIANT-LEVEL STOCK RESTORATION (mirror of sale deduction) ---
        if (item.selectedVariantId && product.variantData) {
          const variant = product.variantData.find(v => v.id === item.selectedVariantId);
          if (variant) {
            const newVariantStock = (variant.stock || 0) + Math.abs(Number(reqItem.qty) || 0);
            const updatedVariantData = product.variantData.map(v =>
              v.id === variant.id ? { ...v, stock: newVariantStock } : v
            );
            await localDb.products.update(product.id, {
              variantData: updatedVariantData,
              updatedAt: now
            });
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
              createdAt: now,
            };
            await localDb.variantStockHistory.add(vRetHistEntry);
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
            returnQueue.push({ entity: 'variant_stock_history', histId: vRetHistId, remote: toRemoteVariantStockHistory(vRetHistEntry), opts: { batchId: id } });
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
            await localDb.products.update(addonProduct.id, {
              stock: newAddonStock,
              updatedAt: now
            });
            // STRIP stock — cloud stock is updated ONLY via stock_history trigger (avoids double-count)
            const remoteRefundAddon = toRemoteProduct({ ...addonProduct, stock: newAddonStock, updatedAt: now });
            delete remoteRefundAddon.stock;
            await queueOp('products', 'update', addonProduct.id, remoteRefundAddon, { batchId: id });

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
            await localDb.stockHistory.add(aHistoryEntry);
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
            returnQueue.push({ entity: 'stock_history', histId: aHistId, remote: toRemoteStockHistory(aHistoryEntry), opts: { batchId: id } });
          }
        }
      }
    }

    // (stock + status are committed atomically further below, after finalStatus is known)
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
    const onlineRet = typeof navigator === 'undefined' || navigator.onLine;
    let returnsCommitted = false;
    if (onlineRet) {
      returnsCommitted = await refundSaleAtomic(id, returnMovements, finalStatus, newRefundedAmount);
    }
    if (returnsCommitted) {
      try { await queueOp('sales', 'update', id, { payment_status: finalStatus } as any, { batchId: id }); } catch (_) { /* non-fatal */ }
    }
    // P6/P24: record refund on the customer ledger (credit reduces what they owe).
    // Recorded REGARDLESS of online/offline (offline-first: localDb + queueOp), and the
    // credit is the INCREMENTAL amount of THIS refund, not the cumulative total (GAP 4).
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
    if (!returnsCommitted) {
      if (returnMovements.length > 0) {
        const stockOk = await applyStockMovementsRemote(returnMovements);
        if (!stockOk) {
          for (const q of returnQueue) {
            await queueOp(q.entity, 'create', q.histId, q.remote, q.opts);
          }
        }
      }
    }

    // 3. Queue RPC Sync (legacy fallback only — atomic refund already handled cloud)
    if (!returnsCommitted) {
      await queueOp('sales', 'update', id, {
        ...toRemoteSale(returnUpdate),
        status: finalStatus,
        updated_at: now.toISOString()
      }, { batchId: id });
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
          totalPurchases: Math.max(0, (customer.totalPurchases || 0) - totalRefundAmount),
          updatedAt: now
        };
        await localDb.customers.put(updatedCustomer);
        await queueOp('customers', 'update', customer.id, toRemoteCustomer(updatedCustomer), { batchId: id });
      }
    }

    // 5. Create reversing payment record for audit trail
    if (totalRefundAmount > 0) {
      const refundMethod = (request?.method && ['cash', 'card', 'digital', 'online'].includes(request.method))
        ? request.method
        : (sale.paymentMethod === 'split' ? 'cash' : (sale.paymentMethod || 'cash'));
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
      await queueOp('payments', 'create', refundPayId, toRemotePayment(refundPayment), { batchId: id });
      // Reverse wallet balances proportionally for the refunded amount (split-aware)
      await adjustPaymentBalances(buildReversePaymentMoves(sale, taxRatio), { batchId: id });
    }
  } finally {
    activeReturns.delete(id);
  }
}
