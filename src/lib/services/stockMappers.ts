import {
  StockHistory,
  VariantStockHistory,
} from '../../types';

export const mapStockHistory = (item: any): StockHistory => ({
  ...item,
  productId: item.product_id ?? item.productId,
  changeQty: item.change_qty ?? item.changeQty,
  referenceId: item.reference_id ?? item.referenceId,
  balanceAfter: item.balance_after ?? item.balanceAfter,
  cashierId: item.cashier_id ?? item.cashierId,
  cashierName: item.cashier_name ?? item.cashierName,
  createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
});

export const mapVariantStockHistory = (item: any): VariantStockHistory => ({
  ...item,
  productId: item.product_id ?? item.productId,
  variantId: item.variant_id ?? item.variantId,
  variantLabel: item.variant_label ?? item.variantLabel,
  changeQty: item.change_qty ?? item.changeQty,
  referenceId: item.reference_id ?? item.referenceId,
  balanceAfter: item.balance_after ?? item.balanceAfter,
  cashierName: item.cashier_name ?? item.cashierName,
  createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
});

export const toRemoteVariantStockHistory = (h: any) => {
  const remote: any = { ...h };
  if ('productId' in h) { remote.product_id = h.productId; delete remote.productId; }
  if ('variantId' in h) { remote.variant_id = h.variantId; delete remote.variantId; }
  if ('variantLabel' in h) { remote.variant_label = h.variantLabel; delete remote.variantLabel; }
  if ('changeQty' in h) { remote.change_qty = h.changeQty; delete remote.changeQty; }
  if ('referenceId' in h) { remote.reference_id = h.referenceId; delete remote.referenceId; }
  if ('balanceAfter' in h) { remote.balance_after = h.balanceAfter; delete remote.balanceAfter; }
  if ('cashierName' in h) { remote.cashier_name = h.cashierName; delete remote.cashierName; }
  if ('createdAt' in h) { remote.created_at = h.createdAt instanceof Date ? h.createdAt.toISOString() : h.createdAt; delete remote.createdAt; }
  return remote;
};

export const toRemoteStockHistory = (h: any) => {
  const remote: any = { ...h };
  if ('productId' in h) { remote.product_id = h.productId; delete remote.productId; }
  if ('changeQty' in h) { remote.change_qty = h.changeQty; delete remote.changeQty; }
  if ('referenceId' in h) { remote.reference_id = h.referenceId; delete remote.referenceId; }
  if ('balanceAfter' in h) { remote.balance_after = h.balanceAfter; delete remote.balanceAfter; }
  if ('createdAt' in h) { remote.created_at = h.createdAt instanceof Date ? h.createdAt.toISOString() : h.createdAt; delete remote.createdAt; }
  if ('cashierId' in h) { remote.cashier_id = h.cashierId; delete remote.cashierId; }
  if ('cashierName' in h) { remote.cashier_name = h.cashierName; delete remote.cashierName; }
  // Strip bad properties
  if ('note' in h) { remote.note = h.note; delete remote.note; } else if ('notes' in h) { remote.note = h.notes; delete remote.notes; }
  if ('quantity' in remote) { if (!remote.change_qty) remote.change_qty = remote.quantity; delete remote.quantity; }
  if ('newStock' in remote) { if (!remote.balance_after) remote.balance_after = remote.newStock; delete remote.newStock; }
  if ('previousStock' in remote) delete remote.previousStock;
  delete remote.wasOversold; // local-only flag, not a DB column
  return remote;
};
