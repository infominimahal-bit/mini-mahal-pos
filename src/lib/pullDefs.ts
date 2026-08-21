import { supabase } from './supabase';
import { localDb, SETTINGS_ID } from './localDb';
import { setStockReconcileSuspended } from './PosDB';
import {
  mapProduct, mapCustomer, mapSale, mapExpense, mapSupplier, mapCategory, mapDiscount,
  mapPurchaseRecord, mapSalesman, mapUser, mapSettings, mapPayment, mapStockHistory,
  mapVariantStockHistory, mapProductAddon, mapBundle, fetchAllPages
} from './services';

export type PullEntity =
  | 'products' | 'customers' | 'sales' | 'expenses' | 'suppliers' | 'categories' | 'discounts'
  | 'purchase_records' | 'salesmen' | 'users' | 'app_settings' | 'payments' | 'supplier_transactions'
  | 'stock_history' | 'variant_stock_history' | 'product_addons' | 'bundles';

export interface PullDef {
  entity: PullEntity;
  remoteTable: string;
  fetch: (since?: Date) => Promise<any[]>; // returns LOCAL-mapped rows
  write: (rows: any[]) => Promise<void>;
}

export const PULL_DEFS: PullDef[] = [
  {
    entity: 'products',
    remoteTable: 'products',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('products').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapProduct);
    },
    write: async (rows) => { if (rows.length) await localDb.products.bulkPut(rows as any); },
  },
  {
    entity: 'customers',
    remoteTable: 'customers',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('customers').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapCustomer);
    },
    write: async (rows) => { if (rows.length) await localDb.customers.bulkPut(rows as any); },
  },
  {
    entity: 'sales',
    remoteTable: 'sales',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('sales').select('*').is('deleted_at', null);
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      }, 200);
      return rows.map(mapSale);
    },
    write: async (rows) => { if (rows.length) await localDb.sales.bulkPut(rows as any); },
  },
  {
    entity: 'expenses',
    remoteTable: 'expenses',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('expenses').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapExpense);
    },
    write: async (rows) => { if (rows.length) await localDb.expenses.bulkPut(rows as any); },
  },
  {
    entity: 'suppliers',
    remoteTable: 'suppliers',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('suppliers').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapSupplier);
    },
    write: async (rows) => { if (rows.length) await localDb.suppliers.bulkPut(rows as any); },
  },
  {
    entity: 'categories',
    remoteTable: 'categories',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('categories').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapCategory);
    },
    write: async (rows) => { if (rows.length) await localDb.categories.bulkPut(rows as any); },
  },
  {
    entity: 'discounts',
    remoteTable: 'discounts',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('discounts').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapDiscount);
    },
    write: async (rows) => { if (rows.length) await localDb.discounts.bulkPut(rows as any); },
  },
  {
    entity: 'purchase_records',
    remoteTable: 'purchase_records',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('purchase_records').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapPurchaseRecord);
    },
    write: async (rows) => { if (rows.length) await localDb.purchaseRecords.bulkPut(rows as any); },
  },
  {
    entity: 'salesmen',
    remoteTable: 'salesmen',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('salesmen').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapSalesman);
    },
    write: async (rows) => { if (rows.length) await localDb.salesmen.bulkPut(rows as any); },
  },
  {
    entity: 'users',
    remoteTable: 'users',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('users').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapUser);
    },
    write: async (rows) => { if (rows.length) await localDb.users.bulkPut(rows as any); },
  },
  {
    entity: 'app_settings',
    remoteTable: 'app_settings',
    fetch: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .maybeSingle();
      return data ? [mapSettings(data)] : [];
    },
    write: async (rows) => { if (rows.length) await localDb.appSettings.put(rows[0]); },
  },
  {
    entity: 'payments',
    remoteTable: 'payments',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('payments').select('*');
        if (since && since.getTime() > 0) q = q.gte('created_at', since.toISOString());
        return q;
      });
      return rows.map(mapPayment);
    },
    write: async (rows) => { if (rows.length) await localDb.payments.bulkPut(rows as any); },
  },
  {
    entity: 'payment_modes',
    remoteTable: 'payment_modes',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('payment_modes').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        balance: Number(r.balance) || 0,
        isActive: r.is_active ?? true,
        updatedAt: r.updated_at,
        createdAt: r.created_at,
      }));
    },
    write: async (rows) => { if (rows.length) await localDb.paymentModes.bulkPut(rows as any); },
  },
  {
    entity: 'supplier_transactions',
    remoteTable: 'supplier_transactions',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('supplier_transactions').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows;
    },
    write: async (rows) => { if (rows.length) await localDb.supplierTransactions.bulkPut(rows as any); },
  },
  {
    entity: 'stock_history',
    remoteTable: 'stock_history',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('stock_history').select('*');
        if (since && since.getTime() > 0) q = q.gte('created_at', since.toISOString());
        return q;
      });
      return rows.map(mapStockHistory);
    },
    write: async (rows) => {
      if (rows.length) {
        setStockReconcileSuspended(true);
        try { await localDb.stockHistory.bulkPut(rows as any); }
        finally { setStockReconcileSuspended(false); }
      }
    },
  },
  {
    entity: 'variant_stock_history',
    remoteTable: 'variant_stock_history',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('variant_stock_history').select('*');
        if (since && since.getTime() > 0) q = q.gte('created_at', since.toISOString());
        return q;
      });
      return rows.map(mapVariantStockHistory);
    },
    write: async (rows) => { if (rows.length) await localDb.variantStockHistory.bulkPut(rows as any); },
  },
  {
    entity: 'product_addons',
    remoteTable: 'product_addons',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('product_addons').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapProductAddon);
    },
    write: async (rows) => { if (rows.length) await localDb.productAddons.bulkPut(rows as any); },
  },
  {
    entity: 'bundles',
    remoteTable: 'bundles',
    fetch: async (since) => {
      const rows = await fetchAllPages(() => {
        let q = supabase.from('bundles').select('*');
        if (since && since.getTime() > 0) q = q.gte('updated_at', since.toISOString());
        return q;
      });
      return rows.map(mapBundle);
    },
    write: async (rows) => { if (rows.length) await localDb.bundles.bulkPut(rows as any); },
  },
];
