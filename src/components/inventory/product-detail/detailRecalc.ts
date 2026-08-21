import { productsService } from '../../../lib/services';
import { localDb } from '../../../lib/localDb';
import { sonner } from '../../../lib/sonner';
import { useProductsStore } from '../../../stores';
import { DetailCtx } from './detailContext';

// PHASE 17 enforcement / desync repair: rebuild product.stock from the
// authoritative stock_history ledger sum. Direct field mutation elsewhere
// can drift the stored stock away from the movement ledger — this restores
// the single-source-of-truth invariant (Opening + IN - OUT = Current).
export async function performRecalc(ctx: DetailCtx) {
  const confirmed = await sonner.confirm(
    ctx.t('recalc_stock_title', 'Recalculate Stock from History?'),
    ctx.t('recalc_stock_desc', 'Stock will be set to the SUM of all movement history. Fixes desync. Current: {cur}')
      .replace('{cur}', String(ctx.product.stock)),
    ctx.t('yes_confirm', 'Yes, Recalculate')
  );
  if (!confirmed.isConfirmed) return;

  ctx.setIsUpdating(true);
  sonner.loading(ctx.t('recalc_stock_loading', 'Recalculating stock...'));
  try {
    const history = await localDb.stockHistory.where('productId').equals(ctx.product.id).toArray();
    let sum = 0;
    for (const h of history) {
      if ((h as any).variantId) continue; // variant movements belong to variant stock, not product stock
      sum += Number((h as any).changeQty) || 0;
    }
    const finalStock = sum;
    const updatedProduct = { ...ctx.product, stock: finalStock, updatedAt: new Date() };
    await productsService.update(ctx.product.id, updatedProduct);
    useProductsStore.getState().updateProduct(updatedProduct);
    ctx.setFormData((prev: any) => ({ ...prev, stock: String(finalStock) }));
    sonner.success(ctx.t('recalc_stock_done', 'Stock recalculated to {n}').replace('{n}', String(finalStock)));
  } catch (e) {
    console.error('Recalc failed', e);
    sonner.error(ctx.t('recalc_stock_error', 'Recalculate failed'));
  } finally {
    ctx.setIsUpdating(false);
    sonner.close();
  }
}
