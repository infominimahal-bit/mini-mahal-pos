import { supabase } from '../supabase';
import {
  VariantStockHistory,
} from '../../types';
import { localDb, generateId } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { toRemoteVariantStockHistory } from './mappers';
import { fetchAllPages } from './utils';

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
    await cloudWrite('variant_stock_history', 'create', id, toRemoteVariantStockHistory(newEntry));
    await localDb.variantStockHistory.add(newEntry);
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

