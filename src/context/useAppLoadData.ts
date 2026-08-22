import { useState, useCallback } from 'react';
import { useCartStore, useSettingsStore, useUsersStore, useProductsStore, useInventoryStore, useCustomersStore, useSalesStore, useExpensesStore, useAppStore } from '../stores';
import { localDb, SETTINGS_ID } from '../lib/localDb';
import { supabase } from '../lib/supabase';
import { sonner } from '../lib/sonner';
import { fetchAllPages } from '../lib/services/utils';
import {
  productsService,
  customersService,
  salesService,
  discountsService,
  usersService,
  suppliersService,
  expensesService,
  purchaseRecordsService,
  categoriesService,
  settingsService,
  salesTabsService,
  purchaseOrdersService,
  supplierTransactionsService,
  paymentModesService,
  bundlesService,
  salesmenService,
  mapProduct,
  mapCustomer,
  mapSale,
  mapUser,
  mapSettings,
  mapSalesman,
  mapExpense,
  mapDiscount,
  mapPurchaseRecord,
  mapPaymentMode
} from '../lib/services';
import { useAuth } from './AuthContext';

/** Fetch a table from Supabase cloud and map each row. */
async function cloudFetch(table: string, mapper?: (r: any) => any, opts?: { order?: string; limit?: number }) {
  let q: any = supabase.from(table).select('*');
  if (opts?.order) q = q.order(opts.order, { ascending: false });
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data as any[]) || [];
  return mapper ? rows.map(mapper) : rows;
}

export function useAppLoadData(initialized: boolean, setInitialized: React.Dispatch<React.SetStateAction<boolean>>) {
  const { user, profile } = useAuth();

  const searchSales = async (term: string) => {
    try {
      const q = term.trim().toLowerCase();
      if (!q) {
        const recent = await localDb.sales.orderBy('timestamp').reverse().limit(500).toArray();
        useSalesStore.getState().setSales(recent.map(mapSale));
        return;
      }

      const allSales = await localDb.sales.toArray();
      const filtered = allSales.filter(s =>
        (s.invoiceNumber || '').toLowerCase().includes(q) ||
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.customerPhone || '').includes(q) ||
        (s.notes || '').toLowerCase().includes(q)
      );

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      useSalesStore.getState().setSales(filtered.slice(0, 100).map(mapSale));
    } catch (error) {
      console.error('Error searching sales:', error);
    }
  };

  const loadMoreSales = async (offset: number, limit: number = 200) => {
    try {
      const sales = await localDb.sales
        .orderBy('timestamp')
        .reverse()
        .offset(offset)
        .limit(limit)
        .toArray();

      if (sales.length > 0) {
        const currentSales = useSalesStore.getState().sales;
        const mapped = sales.map(mapSale);

        const existingIds = new Set(currentSales.map(s => s.id));
        const newSales = mapped.filter(s => !existingIds.has(s.id));

        if (newSales.length > 0) {
          useSalesStore.getState().setSales([...currentSales, ...newSales]);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to load more sales:', error);
      return false;
    }
  };

  const loadData = async (silent = false, forceCloudSync = false) => {
    if (!user) return;
    if (!silent) sonner.loading('Loading POS Data...', { id: 'load-data' });

    try {
      if (!navigator.onLine) {
        throw new Error('Cannot load while offline. Please connect to the internet.');
      }

      console.log('[loadData] Fetching directly from cloud (Supabase)...');
      const [
        cloudProducts,
        cloudCustomers,
        cloudUsers,
        cloudSalesmen,
        cloudDiscounts,
        cloudPaymentModes,
        cloudExpenses,
        cloudPurchaseRecords,
        cloudPurchaseOrders,
        cloudSuppliers,
        cloudSupplierTx,
        cloudSalesTabs,
        cloudCategories,
        cloudBundles,
        cloudSettings,
        cloudSales
      ] = await Promise.allSettled([
        cloudFetch('products', mapProduct),
        cloudFetch('customers', mapCustomer),
        usersService.getAll().catch(() => []),
        cloudFetch('salesmen', mapSalesman),
        cloudFetch('discounts', mapDiscount),
        cloudFetch('payment_modes', mapPaymentMode),
        cloudFetch('expenses', mapExpense),
        cloudFetch('purchase_records', mapPurchaseRecord),
        cloudFetch('purchase_orders'),
        cloudFetch('suppliers'),
        cloudFetch('supplier_transactions'),
        cloudFetch('sales_tabs'),
        cloudFetch('categories'),
        cloudFetch('bundles'),
        (async () => {
          const { data, error } = await supabase.from('app_settings').select('*').eq('id', SETTINGS_ID).single();
          if (error) throw error;
          return data;
        })(),
        cloudFetch('sales', mapSale, { order: 'created_at', limit: 500 }),
      ]);

      const ok = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value : null);

      const products = ok(cloudProducts) || [];
      const customers = ok(cloudCustomers) || [];
      const users = ok(cloudUsers) || [];
      const salesmen = ok(cloudSalesmen) || [];
      const discounts = ok(cloudDiscounts) || [];
      const paymentModes = ok(cloudPaymentModes) || [];
      const expenses = ok(cloudExpenses) || [];
      const purchaseRecords = ok(cloudPurchaseRecords) || [];
      const purchaseOrders = ok(cloudPurchaseOrders) || [];
      const suppliers = ok(cloudSuppliers) || [];
      const supplierTx = ok(cloudSupplierTx) || [];
      const salesTabs = ok(cloudSalesTabs) || [];
      const categories = ok(cloudCategories) || [];
      const bundles = ok(cloudBundles) || [];
      const settingsRow = ok(cloudSettings);
      const sales = ok(cloudSales) || [];

      // Persist into local display cache so search/loadMore keep working offline-of-cache.
      await Promise.allSettled([
        localDb.products.bulkPut(products.map(p => ({ ...p }))),
        localDb.customers.bulkPut(customers),
        localDb.salesmen.bulkPut(salesmen),
        localDb.discounts.bulkPut(discounts),
        localDb.paymentModes.bulkPut(paymentModes),
        localDb.expenses.bulkPut(expenses),
        localDb.purchaseRecords.bulkPut(purchaseRecords),
        localDb.purchaseOrders.bulkPut(purchaseOrders),
        localDb.suppliers.bulkPut(suppliers),
        localDb.supplierTransactions.bulkPut(supplierTx),
        localDb.salesTabs.bulkPut(salesTabs),
        localDb.categories.bulkPut(categories),
        localDb.bundles.bulkPut(bundles),
        localDb.sales.bulkPut(sales),
        ...(settingsRow ? [localDb.appSettings.put({ ...settingsRow })] : []),
        ...(users.length ? [localDb.users.bulkPut(users)] : []),
      ]).catch(() => {});

      // Populate stores (cloud is source of truth)
      if (settingsRow) useSettingsStore.getState().setSettings(mapSettings(settingsRow));
      useProductsStore.getState().setProducts(products);
      useCustomersStore.getState().setCustomers(customers);
      useUsersStore.getState().setUsers(users);
      useUsersStore.getState().setSalesmen(salesmen);
      useAppStore.getState().setDiscounts(discounts);
      useCartStore.getState().setSalesTabs(salesTabs);
      useInventoryStore.getState().setCategories(categories);
      useSettingsStore.getState().setPaymentModes(paymentModes);
      useAppStore.getState().setBundles(bundles);
      useSalesStore.getState().setSales(sales);
      useExpensesStore.getState().setExpenses(expenses);
      useInventoryStore.getState().setPurchaseRecords(purchaseRecords);
      useInventoryStore.getState().setPurchaseOrders(purchaseOrders);
      useInventoryStore.getState().setSuppliers(suppliers);
      useInventoryStore.getState().setSupplierTransactions(supplierTx);

      if (!initialized) setInitialized(true);
      if (!silent) sonner.success('Data loaded successfully', { id: 'load-data' });
    } catch (error: any) {
      console.error('Failed to load data:', error);
      if (!silent) sonner.error(error.message || 'Failed to load data', { id: 'load-data' });
      throw error;
    } finally {
      useSettingsStore.getState().setLoading(false);
      sonner.close();
    }
  };

  return { loadData, loadMoreSales, searchSales };
}
