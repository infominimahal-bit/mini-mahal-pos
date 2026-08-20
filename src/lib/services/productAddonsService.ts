import { supabase } from '../supabase';
import {
  localDb,
  queueOp,
  generateId,
} from '../localDb';
import {
  ProductAddon,
} from '../../types';
import { toRemoteProductAddon } from './mappers';
import { fetchAllPages } from './utils';

export const productAddonsService = {
  async getByProduct(productId: string): Promise<ProductAddon[]> {
    const items = await localDb.productAddons
      .where('productId').equals(productId)
      .toArray();
    return items.filter(a => a.active);
  },

  async create(addon: Omit<ProductAddon, 'id' | 'createdAt'>): Promise<ProductAddon> {
    const id = generateId();
    const now = new Date();
    const newAddon = { ...addon, id, createdAt: now } as ProductAddon;
    await localDb.productAddons.add(newAddon);
    await queueOp('product_addons', 'create', id, toRemoteProductAddon(newAddon));
    return newAddon;
  },

  async update(id: string, updates: Partial<ProductAddon>): Promise<void> {
    await localDb.productAddons.update(id, updates);
    await queueOp('product_addons', 'update', id, toRemoteProductAddon({ ...updates, id }));
  },

  async delete(id: string): Promise<void> {
    await localDb.productAddons.delete(id);
    await queueOp('product_addons', 'delete', id, {});
  },

  async fetchRemote(lastSyncTime?: Date): Promise<ProductAddon[]> {
    const queryFn = () => {
      let q = supabase.from('product_addons').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map((item: any) => ({
      ...item,
      productId: item.product_id ?? item.productId,
      createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
    }));
  }
};
