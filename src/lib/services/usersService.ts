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
import { mapSalesman, mapUser } from './mappers';
import { fetchAllPages } from './utils';

export const salesmenService = {
  async getAll() {
    return await localDb.salesmen.toArray();
  },
  async fetchRemote(lastSyncTime?: Date): Promise<any[]> {
    const queryFn = () => {
      let q = supabase.from('salesmen').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapSalesman);
  },
  async create(salesman: any) {
    const id = generateId();
    const newSalesman = {
      ...salesman,
      id,
      active: salesman.active ?? true,
      createdAt: new Date(),
    };
    const remote = {
      id,
      name: salesman.name,
      phone: salesman.phone,
      active: salesman.active,
      created_at: newSalesman.createdAt.toISOString()
    };
    await localDb.salesmen.put(newSalesman);
    await queueOp('salesmen', 'create', id, remote);
    return newSalesman;
  },
  async update(id: string, updates: any) {
    const remote: any = {};
    if ('name' in updates) remote.name = updates.name;
    if ('phone' in updates) remote.phone = updates.phone;
    if ('active' in updates) remote.active = updates.active;

    await localDb.salesmen.update(id, { ...updates, updatedAt: new Date() });
    await queueOp('salesmen', 'update', id, remote);
    const updated = await localDb.salesmen.get(id);
    return updated;
  },
  async delete(id: string) {
    await localDb.salesmen.delete(id);
    await queueOp('salesmen', 'delete', id, {});
  }
};

/**
 * Users Service
 */
export const usersService = {
  async getAll(): Promise<User[]> {
    return await localDb.users.toArray();
  },

  async fetchRemote(lastSyncTime?: Date): Promise<User[]> {
    const queryFn = () => {
      let q = supabase.from('users').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapUser);
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const existing = await localDb.users.get(id);
    if (!existing) throw new Error('User not found');

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    await localDb.users.put(updated);

    const syncPayload: any = {
      id: updated.id,
      username: updated.username || updated.email?.split('@')[0] || 'user',
      name: updated.name || 'Unknown',
      email: updated.email,
      role: updated.role,
      active: updated.active,
      permissions: updated.permissions,
      can_edit_price: updated.canEditPrice,
      can_give_discount: updated.canGiveDiscount,
      can_delete_sale: updated.canDeleteSale,
      can_view_profit: updated.canViewProfit,
      can_manage_stock: updated.canManageStock,
      can_manage_po: updated.canManagePO,
      can_view_records: updated.canViewRecords,
      can_edit_sale: updated.canEditSale,
      avatar: updated.avatar || null,
      updated_at: new Date().toISOString()
    };

    await queueOp('users', 'update', id, syncPayload);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await localDb.users.delete(id);
    queueOp('users', 'delete', id, {});
    // Also remove the underlying auth user so a "deleted" login can never be used again.
    // Routed through the server-side admin-users Edge Function (key never in browser).
    try {
      await adminUserAction('deleteUser', { id });
    } catch (err) {
      console.warn('[usersService] Could not delete auth user via edge function:', err);
    }
  }
};

// ── Store Order Mapper ──
export const seedMissingBarcodes = async (): Promise<{ count: number; updated: string[] }> => {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, barcode, barcode_value')
    .or('barcode_value.is.null,barcode_value.eq.""');

  if (error) throw error;
  if (!products || products.length === 0) {
    return { count: 0, updated: [] };
  }

  const updatedNames: string[] = [];
  for (const prod of products) {
    const val = prod.barcode || generateBarcodeValue(prod.name || prod.id);
    // OFFLINE-FIRST: update local + queue (never direct supabase write).
    await localDb.products.where('id').equals(prod.id).modify({ barcodeValue: val, barcode: val });
    await queueOp('products', 'update', prod.id, { barcode_value: val, barcode: val } as any);
    updatedNames.push(prod.name);
  }

  return { count: updatedNames.length, updated: updatedNames };
};

// ─────────────────────────────────────────────────────────────────────────────
// BUNDLE / DEAL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/** Map from Supabase row → Bundle object */
