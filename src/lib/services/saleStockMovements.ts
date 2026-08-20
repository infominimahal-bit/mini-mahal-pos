import { localDb, generateId } from '../localDb';

// Build the stock_history movement rows for a sale, in the RPC payload shape
// (id, product_id, change_qty, type, note, variant_id, variant_label, cashier_name).
// reverse=true produces RESTORATION movements (positive qty) used to undo an
// edited/old sale inside edit_sale_atomic. Mirrors the movement logic in create().
export async function buildSaleStockMovements(sale: any, reverse: boolean, invoiceLabel: string): Promise<any[]> {
  const movements: any[] = [];
  const mult = reverse ? 1 : -1;
  const tag = reverse ? 'Reverse' : 'Sale';
  for (const item of sale.items || []) {
    const product = await localDb.products.get(item?.product?.id);
    if (product && product.trackInventory) {
      const qty = Math.abs(Number(item.weight || item.quantity) || 0);
      movements.push({
        id: generateId(),
        product_id: product.id,
        change_qty: mult * qty,
        type: reverse ? 'return' : 'sale',
        note: `${tag} ${invoiceLabel}`,
        variant_id: '',
        variant_label: '',
        cashier_name: sale.cashier || 'System',
      });
    }
    if (item.selectedVariantId && product?.variantData) {
      const variant = product.variantData.find((v: any) => v.id === item.selectedVariantId);
      if (variant) {
        const qty = Math.abs(Number(item.weight || item.quantity) || 0);
        movements.push({
          id: generateId(),
          product_id: product.id,
          change_qty: mult * qty,
          type: reverse ? 'return' : 'sale',
          note: `${tag} ${invoiceLabel}`,
          variant_id: item.selectedVariantId,
          variant_label: item.selectedVariantLabel || variant.cardTitle || variant.option1 || '',
          cashier_name: sale.cashier || 'System',
        });
      }
    }
    if (item.addonItems && item.addonItems.length > 0) {
      const parentQty = Math.abs(Number(item.weight || item.quantity) || 0);
      for (const addonItem of item.addonItems) {
        const addonProduct = await localDb.products.get(addonItem?.addon?.addonProductId);
        if (addonProduct && addonProduct.trackInventory) {
          const addonQty = addonItem.quantity * parentQty;
          movements.push({
            id: generateId(),
            product_id: addonProduct.id,
            change_qty: mult * addonQty,
            type: reverse ? 'return' : 'sale',
            note: `${tag} ${invoiceLabel} (addon)`,
            variant_id: '',
            variant_label: '',
            cashier_name: sale.cashier || 'System',
          });
        }
      }
    }
  }
  if (sale.freeGifts && sale.freeGifts.length > 0) {
    for (const gift of sale.freeGifts) {
      const gProduct = await localDb.products.get(gift?.product?.id);
      if (gProduct && gProduct.trackInventory) {
        const gQty = Math.abs(gift.quantity || 1);
        movements.push({
          id: generateId(),
          product_id: gProduct.id,
          change_qty: mult * gQty,
          type: reverse ? 'return' : 'sale',
          note: `${tag} ${invoiceLabel} (gift)`,
          variant_id: '',
          variant_label: '',
          cashier_name: sale.cashier || 'System',
        });
      }
    }
  }
  return movements;
}
