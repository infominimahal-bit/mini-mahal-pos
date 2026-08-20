import { PurchaseRecord } from '../../../types';
import { productsService, purchaseRecordsService, generateId, toRemoteStockHistory } from '../../../lib/services';
import { localDb, queueOp } from '../../../lib/localDb';
import { sonner } from '../../../lib/sonner';
import { useProductsStore, useInventoryStore } from '../../../stores';
import { DetailCtx } from './detailContext';

export async function performAdjustment(ctx: DetailCtx) {
  const rawQty = Math.abs(parseInt(ctx.adjustmentData.quantity));
  if (!rawQty || rawQty === 0) return;
  const qtyChange = ctx.adjustmentData.action === 'remove' ? -rawQty : rawQty;
  const reason = ctx.adjustmentData.reason || 'Correction';

  const result = await sonner.confirm(
    ctx.t('confirm_adjustment_title', 'Confirm Adjustment?'),
    ctx.t('confirm_adjustment_desc', 'Adjusting stock by <strong>{qty}</strong> due to <strong>{reason}</strong>.')
      .replace('{qty}', (qtyChange > 0 ? '+' : '') + qtyChange)
      .replace('{reason}', reason),
    ctx.t('yes_confirm', 'Yes, Confirm')
  );

  if (!result.isConfirmed) return;

  ctx.setIsUpdating(true);
  sonner.loading(ctx.t('adjusting_stock', 'Adjusting stock...'));

  try {
    const now = new Date();

    const newRecord = {
      id: generateId(),
      productId: ctx.product.id,
      productName: ctx.product.name,
      sku: ctx.product.sku || '',
      quantity: qtyChange,
      costPrice: ctx.product.cost || 0,
      totalAmount: Math.abs(qtyChange) * (ctx.product.cost || 0),
      type: 'Adjustment',
      supplier: reason.toUpperCase(),
      date: now,
      addedBy: ctx.profile?.email || 'System',
      notes: ctx.adjustmentData.notes ? `${reason}: ${ctx.adjustmentData.notes}` : `Manual Adjustment: ${reason}`
    } as PurchaseRecord;

    const freshProduct = await localDb.products.get(ctx.product.id);
    const currentStock = freshProduct?.stock ?? ctx.product.stock ?? 0;
    const finalStock = Math.max(0, currentStock + qtyChange);
    const appliedDelta = finalStock - currentStock;

    const updatedProduct = {
      ...ctx.product,
      stock: finalStock,
      updatedAt: now
    };

    await productsService.update(ctx.product.id, updatedProduct);
    useProductsStore.getState().updateProduct(updatedProduct);

    const histId = generateId();
    const histEntry = {
      id: histId,
      productId: ctx.product.id,
      changeQty: appliedDelta,
      type: appliedDelta >= 0 ? 'adjustment' as const : 'adjustment_out' as const,
      referenceId: newRecord.id,
      note: `Adjustment: ${reason}`,
      balanceAfter: finalStock,
      cashierName: ctx.profile?.email || 'System',
      createdAt: now
    };
    await localDb.stockHistory.add(histEntry);
    await queueOp('stock_history', 'create', histId, toRemoteStockHistory(histEntry));

    await purchaseRecordsService.create(newRecord);
    useInventoryStore.getState().addPurchaseRecord(newRecord);

    ctx.setFormData(prev => ({ ...prev, stock: String(finalStock) }));

    sonner.success(ctx.t('stock_adjusted_success', 'Stock adjusted successfully'));
    ctx.setShowAdjustment(false);
    ctx.setAdjustmentData({ action: 'remove', quantity: '1', reason: 'Correction', notes: '' });
  } catch (error) {
    console.error('Adjustment failed:', error);
    sonner.error(ctx.t('stock_adjusted_error', 'Failed to adjust stock'));
  } finally {
    ctx.setIsUpdating(false);
    sonner.close();
  }
}
