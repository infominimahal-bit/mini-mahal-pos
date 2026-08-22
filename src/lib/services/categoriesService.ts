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
import { mapDiscount } from './mappers';
import { fetchAllPages } from './utils';

export const mapCategory = (item: any): Category => ({
  ...item,
  createdAt: item.created_at ? new Date(item.created_at) : (item.createdAt ? new Date(item.createdAt) : undefined)
});

export const categoriesService = {
  async getAll() { return await localDb.categories.toArray(); },
  async create(nameOrObj: string | Category) {
    const id = typeof nameOrObj === 'object' ? (nameOrObj.id || generateId()) : generateId();
    const name = typeof nameOrObj === 'object' ? nameOrObj.name : nameOrObj;
    const description = typeof nameOrObj === 'object' ? nameOrObj.description : undefined;
    const cat = { id, name, description, active: true, createdAt: new Date() };
    await cloudWrite('categories', 'create', id, {
      id,
      name,
      description,
      active: true,
      created_at: new Date().toISOString()
    });
    await localDb.categories.add(cat);
    return cat;
  },
  async update(id: string, updates: Partial<Category>): Promise<void> {
    const existing = await localDb.categories.get(id);
    const merged: any = existing ? { ...existing, ...updates } : updates;
    const remote: any = {
      name: merged.name,
      description: merged.description ?? null,
      active: merged.active ?? true,
    };
    await cloudWrite('categories', 'update', id, remote);
    await localDb.categories.where('id').equals(id).modify(updates);
  },
  async fetchRemote(lastSyncTime?: Date): Promise<Category[]> {
    const queryFn = () => {
      let q = supabase.from('categories').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapCategory);
  }
};

export const discountsService = {
  async getAll(): Promise<Discount[]> {
    return await localDb.discounts.toArray();
  },
  async create(data: any) {
    const id = generateId();
    const discount = { ...data, id };
    const remote: any = {
      ...discount,
      min_amount: discount.minAmount,
      max_discount: discount.maxDiscount,
      valid_days: discount.validDays || [],
      valid_from: discount.validFrom.toISOString(),
      valid_to: discount.validTo.toISOString(),
      is_auto_apply: discount.isAutoApply,
      created_at: discount.createdAt instanceof Date ? discount.createdAt.toISOString() : (discount.createdAt || new Date().toISOString()),
      updated_at: discount.updatedAt instanceof Date ? discount.updatedAt.toISOString() : (discount.updatedAt || new Date().toISOString()),
    };
    delete remote.minAmount;
    delete remote.maxDiscount;
    delete remote.validDays;
    delete remote.validFrom;
    delete remote.validTo;
    delete remote.isAutoApply;
    delete remote.createdAt;
    delete remote.updatedAt;
    await cloudWrite('discounts', 'create', id, remote);
    await localDb.discounts.add(discount);
  },

  async fetchRemote(lastSyncTime?: Date): Promise<Discount[]> {
    const queryFn = () => {
      let q = supabase.from('discounts').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapDiscount);
  },

  async update(id: string, updates: Partial<Discount>): Promise<Discount> {
    const existing = await localDb.discounts.get(id);
    if (!existing) throw new Error('Discount not found');
    const updated = { ...existing, ...updates, id, updatedAt: new Date() } as Discount;
    const remote: any = { ...updated };
    remote.min_amount = updated.minAmount;
    remote.max_discount = updated.maxDiscount;
    remote.valid_days = updated.validDays || [];
    if (updated.validFrom) remote.valid_from = (updated.validFrom as Date).toISOString();
    if (updated.validTo) remote.valid_to = (updated.validTo as Date).toISOString();
    remote.is_auto_apply = updated.isAutoApply;
    remote.updated_at = updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : (updated.updatedAt || new Date().toISOString());
    delete remote.minAmount;
    delete remote.maxDiscount;
    delete remote.validDays;
    delete remote.validFrom;
    delete remote.validTo;
    delete remote.isAutoApply;
    delete remote.createdAt;
    delete remote.updatedAt;
    await cloudWrite('discounts', 'update', id, remote);
    await localDb.discounts.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await cloudWrite('discounts', 'delete', id, {});
    await localDb.discounts.delete(id);
  }
};
/**
 * Purchase Records & Stock IN
 */
