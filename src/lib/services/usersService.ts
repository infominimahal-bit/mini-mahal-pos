import { supabase } from '../supabase';
import {
  User,
} from '../../types';
import { localDb, generateId } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { generateBarcodeValue } from '../../utils/barcode';
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
    await cloudWrite('salesmen', 'create', id, remote);
    await localDb.salesmen.put(newSalesman);
    return newSalesman;
  },
  async update(id: string, updates: any) {
    const remote: any = {};
    if ('name' in updates) remote.name = updates.name;
    if ('phone' in updates) remote.phone = updates.phone;
    if ('active' in updates) remote.active = updates.active;

    await cloudWrite('salesmen', 'update', id, { ...remote, id });
    await localDb.salesmen.update(id, { ...updates, updatedAt: new Date() });
    const updated = await localDb.salesmen.get(id);
    return updated;
  },
  async delete(id: string) {
    await cloudWrite('salesmen', 'delete', id, {});
    await localDb.salesmen.delete(id);
  }
};

/**
 * Users Service
 */
export const usersService = {
  async getAll(): Promise<User[]> {
    const users = await localDb.users.toArray();
    return users.filter((u: any) => !u.deleted_at && !u.deletedAt);
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

    const syncPayload: any = {
      id: updated.id,
      username: updated.username || updated.email?.split('@')[0] || 'user',
      name: updated.name || 'Unknown',
      email: updated.email,
      role: updated.role,
      active: updated.active,
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

    await cloudWrite('users', 'update', id, syncPayload);
    await localDb.users.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_user', { p_target_user_id: id });
    if (error) throw error;
    await localDb.users.delete(id);
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
    // PHASE 39A: rotate the stored action hash so old signed tokens become invalid,
    // and revoke active sessions so stale logins expire.
    const newHash = await hashPasswordString(newPassword);
    await supabase.from('users').update({ action_hash: newHash } as any).eq('id', userId).then(() => {}).catch(() => {});
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
    await cloudWrite('products', 'update', prod.id, { id: prod.id, barcode_value: val, barcode: val, updated_at: new Date().toISOString() } as any);
    await localDb.products.where('id').equals(prod.id).modify({ barcodeValue: val, barcode: val });
    updatedNames.push(prod.name);
  }

  return { count: updatedNames.length, updated: updatedNames };
};

// ─────────────────────────────────────────────────────────────────────────────
// BUNDLE / DEAL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/** Map from Supabase row → Bundle object */
