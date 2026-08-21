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
import { hashPasswordString } from '../authUtils';
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
    // PHASE 39A: SOFT delete. Keep the row + auth account so sales/audit history
    // survives; login is permanently rejected by the deleted_at / active gates in
    // signInLogic.ts + AuthContext. We do NOT hard-delete the auth user.
    const now = new Date();
    await localDb.users.update(id, { active: false, deletedAt: now, updatedAt: now } as any);
    await queueOp('users', 'update', id, { active: false, deleted_at: now.toISOString(), updated_at: now.toISOString() });
    try { await supabase.rpc('revoke_user_sessions', { p_user_id: id }); } catch (e) { console.warn('[usersService] revoke sessions on delete failed:', e); }
  },

  async blockUser(userId: string) {
    const { error } = await supabase.rpc('admin_block_user', { p_target_user_id: userId });
    if (error) throw error;
    await localDb.users.update(userId, { active: false, updatedAt: new Date() } as any);
    // Kill every active session immediately so a blocked user is logged out everywhere.
    try { await supabase.rpc('revoke_user_sessions', { p_user_id: userId }); } catch (e) { console.warn('[usersService] revoke sessions on block failed:', e); }
  },

  async changeUserPassword(userId: string, newPassword: string) {
    const { error } = await supabase.rpc('admin_change_password', {
      p_target_user_id: userId,
      p_new_password: newPassword
    });
    if (error) throw error;
    // PHASE 39A: rotate the stored offline hash so old signed tokens become invalid,
    // and revoke active sessions so stale logins expire.
    const newHash = await hashPasswordString(newPassword);
    await supabase.from('users').update({ offline_hash: newHash } as any).eq('id', userId).then(() => {}).catch(() => {});
    try { await supabase.rpc('revoke_user_sessions', { p_user_id: userId }); } catch (e) { console.warn('[usersService] revoke sessions on pw change failed:', e); }
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
