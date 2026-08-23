import { SalesTab } from '../../types';
import { localDb, generateId } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { supabase } from '../supabase';




/**
 * Sales Service
 * Implements atomic-like stock logic and local-first persistence
 */
export const toRemoteSalesTab = (tab: Partial<SalesTab>) => {
  const remote: any = { ...tab };
  if ('userId' in tab) { remote.user_id = tab.userId; delete remote.userId; }
  if ('billDiscountValue' in tab) { remote.bill_discount_value = tab.billDiscountValue; delete remote.billDiscountValue; }
  if ('billDiscountType' in tab) { remote.bill_discount_type = tab.billDiscountType; delete remote.billDiscountType; }
  if ('createdAt' in tab) { remote.created_at = tab.createdAt; delete remote.createdAt; }
  if ('editingSaleId' in tab) { remote.editing_sale_id = tab.editingSaleId ?? null; delete remote.editingSaleId; }

  // Extract only the customer ID for the DB column
  if (tab.selectedCustomer) {
    remote.selected_customer_id = tab.selectedCustomer.id;
  } else if ('selectedCustomer' in tab) {
    remote.selected_customer_id = null;
  }

  // Strip full customer object (not a DB column, reconstructed from ID on load)
  delete remote.selectedCustomer;

  return remote;
};

/**
 * Sales Tabs
 */
export const salesTabsService = {
  async getByUserId(userId: string): Promise<SalesTab[]> {
    try {
      const { data, error } = await supabase
        .from('sales_tabs')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      const tabs = (data || []).map((row: any): SalesTab => ({
        id: row.id,
        name: row.name || 'Sale 1',
        userId: row.user_id,
        cart: Array.isArray(row.cart) ? row.cart : [],
        selectedCustomer: null, // reconstructed separately if needed
        billDiscountValue: row.bill_discount_value ?? 0,
        billDiscountType: row.bill_discount_type ?? 'percentage',
        notes: row.notes || '',
        editingSaleId: row.editing_sale_id ?? null,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      }));
      // Sync to local cache
      await localDb.salesTabs.where('userId').equals(userId).delete();
      if (tabs.length > 0) await localDb.salesTabs.bulkPut(tabs);
      return tabs;
    } catch {
      // Fallback to local cache
      return await localDb.salesTabs.where('userId').equals(userId).toArray();
    }
  },
  async create(userId: string, tab: Omit<SalesTab, 'id' | 'createdAt'>): Promise<SalesTab> {
    const id = generateId();
    const now = new Date();
    const newTab = { ...tab, id, userId, createdAt: now } as SalesTab;
    await cloudWrite('sales_tabs', 'create', id, toRemoteSalesTab(newTab));
    await localDb.salesTabs.add(newTab);
    return newTab;
  },
  async update(id: string, updates: Partial<SalesTab>): Promise<void> {
    const existing = await localDb.salesTabs.get(id);
    const updated = { ...(existing || {}), ...updates, id } as SalesTab;

    // Partial upsert (only provided columns) so we never overwrite other columns
    // (like 'name') with null. id is always included so the row is targeted.
    await cloudWrite('sales_tabs', 'update', id, { ...toRemoteSalesTab(updates), id });
    await localDb.salesTabs.put(updated);
  },
  async delete(id: string): Promise<void> {
    await cloudWrite('sales_tabs', 'delete', id, {});
    await localDb.salesTabs.delete(id);
  }
};

/**
 * Supplier Transactions Service
 */
