import { PurchaseRecord } from '../../../types';
import { purchaseRecordsService, generateId } from '../../../lib/services';
import { localDb } from '../../../lib/localDb';
import { supabase } from '../../../lib/supabase';
import { sonner } from '../../../lib/sonner';
import { useProductsStore, useInventoryStore } from '../../../stores';
import { DetailCtx } from './detailContext';

export async function performAdjustment(ctx: DetailCtx) {
  const qtyChange = parseInt(ctx.adjustmentData.quantity);
  if (isNaN(qtyChange) || qtyChange === 0) return;
  const reason = ctx.adjustmentData.reason || 'Correction';

  const result = await sonner.confirm(
    'Confirm Adjustment?',
    'Adjusting stock by <strong>{qty}</strong> due to <strong>{reason}</strong>.'
      .replace('{qty}', (qtyChange > 0 ? '+' : '') + qtyChange)
      .replace('{reason}', reason),
    'Yes, Confirm'
  );

  if (!result.isConfirmed) return;

  ctx.setIsUpdating(true);
  sonner.loading('Adjusting stock...');

  try {
    const now = new Date();
    const freshProduct = await localDb.products.get(ctx.product.id);
    const currentStock = freshProduct?.stock ?? ctx.product.stock ?? 0;
    // Signed new stock (negative allowed per plan PART O — problem is never hidden).
    const newStock = currentStock + qtyChange;
    const adjustmentId = generateId();

    const newRecord = {
      id: adjustmentId,
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
      notes: ctx.adjustmentData.notes ? `${reason}: ${ctx.adjustmentData.notes ? ctx.adjustmentData.notes : reason}` : `Manual Adjustment: ${reason}`
    } as PurchaseRecord;

    // Cloud: single authoritative stock update via RPC (trigger applies it once).
    // Never edit products.stock directly. Stable id => idempotent on retry.
    const { error } = await supabase.rpc('stock_adjustment', {
      p_product_id: ctx.product.id,
      p_change_qty: qtyChange,
      p_type: qtyChange >= 0 ? 'adjustment' : 'adjustment_out',
      p_note: `Adjustment: ${reason}`,
      p_cashier: ctx.profile?.email || 'System',
      p_variant_id: null,
      p_variant_label: null,
      p_adjustment_id: adjustmentId
    });
    if (error) throw error;

    // Local cache update (display only; cloud trigger already moved stock).
    const updatedProduct = { ...ctx.product, stock: newStock, updatedAt: now };
    await localDb.products.update(ctx.product.id, { stock: newStock, updatedAt: now });
    useProductsStore.getState().updateProduct(updatedProduct);

    const histEntry = {
      id: adjustmentId,
      productId: ctx.product.id,
      changeQty: qtyChange,
      type: (qtyChange >= 0 ? 'adjustment' : 'adjustment_out') as const,
      referenceId: adjustmentId,
      note: `Adjustment: ${reason}`,
      balanceAfter: newStock,
      cashierName: ctx.profile?.email || 'System',
      createdAt: now
    };
    await localDb.stockHistory.add(histEntry);

    await purchaseRecordsService.create(newRecord);
    useInventoryStore.getState().addPurchaseRecord(newRecord);

    ctx.setFormData(prev => ({ ...prev, stock: String(newStock) }));

    sonner.success('Stock adjusted successfully');
    ctx.setShowAdjustment(false);
    ctx.setAdjustmentData({ action: 'remove', quantity: '1', reason: 'Correction', notes: '' });
  } catch (error) {
    console.error('Adjustment failed:', error);
    sonner.error('Failed to adjust stock');
  } finally {
    ctx.setIsUpdating(false);
    sonner.close();
  }
}
