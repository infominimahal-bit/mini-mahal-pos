import { formatCurrency } from '../../../lib/currencies';
import { commitStockInToInventory } from '../../../lib/stockInCommit';
import { sonner } from '../../../lib/sonner';
import { DetailCtx } from './detailContext';

export async function performQuickRestock(ctx: DetailCtx) {
  const qty = parseFloat(ctx.restockData.quantity);
  if (!qty || qty <= 0) return;
  const cost = parseFloat(ctx.restockData.cost) || ctx.product.cost || 0;
  const supplier = ctx.restockData.supplier.trim();

  if (!supplier) {
    sonner.error(ctx.t('supplier_required', 'Select a supplier to continue'));
    return;
  }

  const result = await sonner.confirm(
    ctx.t('confirm_restock_title', 'Confirm Quick Restock?'),
    ctx.t('confirm_restock_desc', 'Add <strong>{qty} units</strong> of <strong>{name}</strong> to inventory counts for <strong>{total}</strong>.')
      .replace('{qty}', String(qty))
      .replace('{name}', ctx.product.name)
      .replace('{total}', formatCurrency(qty * cost, ctx.currency)),
    ctx.t('yes_restock', 'Yes, Add Stock')
  );

  if (!result.isConfirmed) return;

  ctx.setIsUpdating(true);
  sonner.loading(ctx.t('restocking', 'Adding stock...'));

  try {
    await commitStockInToInventory({
      items: [{
        id: ctx.product.id,
        name: ctx.product.name,
        sku: ctx.product.sku || '',
        quantity: qty,
        costPrice: cost,
        supplier,
        type: 'Stock IN',
        notes: `Quick Restock | ${new Date().toLocaleDateString()}`
      }],
      recordAsSupplierBill: ctx.restockData.recordAsSupplierBill,
      suppliers: ctx.appSuppliers,
      profile: ctx.profile,
      dispatch
    });

    const newStock = (ctx.product.stock || 0) + qty;
    ctx.setFormData(prev => ({ ...prev, stock: String(newStock) }));

    sonner.success(ctx.t('restock_success', 'Stock added successfully'));
    ctx.setShowRestock(false);
    ctx.setRestockData({
      quantity: '1',
      supplier: ctx.product.supplier || '',
      cost: ctx.product.cost?.toString() || '',
      recordAsSupplierBill: false
    });
  } catch (error) {
    console.error('Quick restock failed:', error);
    sonner.error(ctx.t('restock_error', 'Failed to add stock'));
  } finally {
    ctx.setIsUpdating(false);
    sonner.close();
  }
}
