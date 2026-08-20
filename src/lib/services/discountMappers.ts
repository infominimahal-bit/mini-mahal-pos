import {
  Discount,
  PurchaseRecord,
} from '../../types';

export const mapDiscount = (item: any): Discount => ({
  ...item,
  validFrom: item.valid_from ? new Date(item.valid_from) : new Date(item.validFrom),
  validTo: item.valid_to ? new Date(item.valid_to) : new Date(item.validTo),
  validDays: item.valid_days ?? item.validDays,
  isAutoApply: item.is_auto_apply ?? item.isAutoApply,
  createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(item.updatedAt)
});

export const mapPurchaseRecord = (item: any): PurchaseRecord => ({
  ...item,
  productId: item.product_id ?? item.productId,
  supplierId: item.supplier_id ?? item.supplierId,
  variantId: item.variant_id ?? item.variantId,
  variantLabel: item.variant_label ?? item.variantLabel,
  costPrice: item.cost_price ? Number(item.cost_price) : 0,
  qtyRemaining: item.qty_remaining ?? item.qtyRemaining,
  date: item.date ? new Date(item.date) : new Date(),
  createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(item.updatedAt)
});

export const toRemotePurchaseRecord = (r: any) => {
  const remote: any = { ...r };
  if ('productId' in r) { remote.product_id = r.productId; delete remote.productId; }
  if ('productName' in r) { remote.product_name = r.productName; delete remote.productName; }
  if ('supplierId' in r) { remote.supplier_id = r.supplierId; delete remote.supplierId; }
  if ('variantId' in r) { remote.variant_id = r.variantId; delete remote.variantId; }
  if ('variantLabel' in r) { remote.variant_label = r.variantLabel; delete remote.variantLabel; }
  if ('costPrice' in r) { remote.cost_price = r.costPrice; delete remote.costPrice; }
  if ('retailPrice' in r) { remote.retail_price = r.retailPrice; delete remote.retailPrice; }
  if ('totalAmount' in r) { remote.total_amount = r.totalAmount; delete remote.totalAmount; }
  if ('addedBy' in r) { remote.added_by = r.addedBy; delete remote.addedBy; }
  if ('qtyRemaining' in r) { remote.qty_remaining = r.qtyRemaining; delete remote.qtyRemaining; }
  if ('date' in r) { remote.date = r.date instanceof Date ? r.date.toISOString() : r.date; delete remote.date; }
  if ('createdAt' in r) { remote.created_at = r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt; delete remote.createdAt; }
  if ('updatedAt' in r) { remote.updated_at = r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt; delete remote.updatedAt; }
  return remote;
};
