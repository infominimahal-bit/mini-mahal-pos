import { supabase, adminUserAction } from '../supabase';
import {
  Product,
  Customer,
  Sale,
  Discount,
  User,
  AppSettings,
  SalesTab,
  Expense,
  Category,
  Supplier,
  PurchaseRecord,
  SupplierTransaction,
  StockHistory,
  Payment,
  PurchaseOrder,
  Bundle,
  BundleItem,
  CartItem,
  RefundRequest,
  Topping,
  VariantStockHistory,
  ProductAddon,
} from '../../types';
import { localDb, generateId, SETTINGS_ID } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { generateBarcodeValue } from '../../utils/barcode';
import { signAction, withActor } from '../actionToken';
import { mapStockHistory, toRemoteVariantStockHistory, mapPurchaseRecord, toRemoteProduct, toRemotePurchaseRecord, toRemoteStockHistory } from './mappers';
import { fetchAllPages } from './utils';
import { applyStockMovementsRemote } from './atomicOps';

export async function applyVariantStockMovement(params: {
  product: Product;
  variantId: string;
  variantLabel?: string;
  changeQty: number;
  type: 'sale' | 'return' | 'adjustment' | 'initial' | 'purchase';
  referenceId?: string;
  note?: string;
  cashierName?: string;
  createdAt?: Date;
}): Promise<void> {
  const { product, variantId, changeQty } = params;
  const now = params.createdAt || new Date();

  const variant = (product.variantData || []).find(v => v.id === variantId);
  if (!variant) return;

  const newVariantStock = (variant.stock || 0) + changeQty;

  const vHistId = generateId();
  const vHistEntry: VariantStockHistory = {
    id: vHistId,
    productId: product.id,
    variantId,
    variantLabel: params.variantLabel || variant.cardTitle || variant.option1,
    changeQty,
    type: params.type,
    referenceId: params.referenceId,
    note: params.note,
    balanceAfter: newVariantStock,
    cashierName: params.cashierName || 'System',
    createdAt: now,
  };

  // Cloud-direct FIRST: the variant_stock_history insert drives the cloud variant
  // stock via DB trigger. Throw on failure so we never mutate the local cache when
  // the authoritative cloud write did not persist.
  await cloudWrite('variant_stock_history', 'create', vHistId, toRemoteVariantStockHistory(vHistEntry));

  // Local cache update (cloud stock already handled by the trigger above).
  const updatedVariantData = (product.variantData || []).map(v =>
    v.id === variantId ? { ...v, stock: newVariantStock } : v
  );
  // Read fresh product so we never clobber concurrent field edits
  const fresh = (await localDb.products.get(product.id)) || product;
  await localDb.products.update(product.id, {
    variantData: fresh.variantData ? fresh.variantData.map(v =>
      v.id === variantId ? { ...v, stock: newVariantStock } : v
    ) : updatedVariantData,
    updatedAt: now
  });
  await localDb.variantStockHistory.add(vHistEntry);
}

/**
 * Variant Stock History Service
 */
