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
  ProductBatch,
  SupplierTransaction,
  StockHistory,
  Payment,
  PurchaseOrder,
  Bundle,
  BundleItem,
  CartItem,
  RefundRequest,
  Topping,
  ExtraTopping,
  VariantStockHistory,
  ProductAddon,
} from '../../types';
import { localDb, queueOp, generateId, SETTINGS_ID } from '../localDb';
import { generateBarcodeValue } from '../../utils/barcode';
import { signAction, withActor } from '../actionToken';
import { mapStockHistory, toRemoteVariantStockHistory, mapPurchaseRecord, toRemoteProduct, toRemotePurchaseRecord, toRemoteStockHistory } from './mappers';
import { fetchAllPages } from './utils';
import { applyStockMovementsRemote } from './atomicOps';

export const variantStockHistoryService = {
  async getByProduct(productId: string): Promise<VariantStockHistory[]> {
    const items = await localDb.variantStockHistory
      .where('productId').equals(productId)
      .toArray();
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getByVariant(productId: string, variantId: string): Promise<VariantStockHistory[]> {
    const items = await localDb.variantStockHistory
      .where('productId').equals(productId)
      .toArray();
    return items
      .filter(h => h.variantId === variantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(entry: Omit<VariantStockHistory, 'id' | 'createdAt'>): Promise<VariantStockHistory> {
    const id = generateId();
    const now = new Date();
    const newEntry = { ...entry, id, createdAt: now } as VariantStockHistory;
    await localDb.variantStockHistory.add(newEntry);
    await queueOp('variant_stock_history', 'create', id, toRemoteVariantStockHistory(newEntry));
    return newEntry;
  },

  async fetchRemote(lastSyncTime?: Date): Promise<VariantStockHistory[]> {
    const queryFn = () => {
      let q = supabase.from('variant_stock_history').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map((item: any) => ({
      ...item,
      productId: item.product_id ?? item.productId,
      variantId: item.variant_id ?? item.variantId,
      changeQty: item.change_qty ?? item.changeQty,
      balanceAfter: item.balance_after ?? item.balanceAfter,
      referenceId: item.reference_id ?? item.referenceId,
      createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
    }));
  }
};

