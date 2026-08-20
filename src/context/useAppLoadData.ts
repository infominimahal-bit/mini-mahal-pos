import { useState, useCallback } from 'react';
import { useCartStore, useSettingsStore, useUsersStore, useProductsStore, useInventoryStore, useCustomersStore, useSalesStore, useExpensesStore, useAppStore } from '../stores';
import { localDb } from '../lib/localDb';
import { pullCloudChanges } from '../lib/cloudPull';
import { sonner } from '../lib/sonner';
import { isSyncEngineBusy } from '../lib/syncEngine';
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
import type { PullEntity } from '../lib/cloudPull';
import { SETTINGS_ID } from '../lib/localDb';
import { useAuth } from './AuthContext';

export function useAppLoadData(initialized: boolean, setInitialized: React.Dispatch<React.SetStateAction<boolean>>) {
  const { user, profile } = useAuth();
  
  const handleCloudPullChanged = useCallback(async (entities: PullEntity[]) => {
    if (!entities || entities.length === 0) return;
    console.log('[CloudPull] Refreshing state for entities:', entities.join(', '));

    for (const entity of entities) {
      try {
        switch (entity) {
          case 'products': {
            const all = await localDb.products.toArray();
            useProductsStore.getState().setProducts(all.map(mapProduct));
            break;
          }
          case 'customers': {
            const all = await localDb.customers.toArray();
            useCustomersStore.getState().setCustomers(all.map(mapCustomer));
            break;
          }
          case 'sales': {
            const all = await localDb.sales.orderBy('timestamp').reverse().limit(500).toArray();
            useSalesStore.getState().setSales(all.map(mapSale));
            break;
          }
          case 'users': {
            const all = await localDb.users.toArray();
            useUsersStore.getState().setUsers(all.map(mapUser));
            break;
          }
          case 'app_settings': {
            const all = await localDb.appSettings.toArray();
            if (all.length > 0) useSettingsStore.getState().setSettings(mapSettings(all[0]));
            break;
          }
          case 'sales_tabs': {
            const all = await localDb.salesTabs.toArray();
            useCartStore.getState().setSalesTabs(all);
            break;
          }
          case 'salesmen': {
            const all = await localDb.salesmen.toArray();
            useUsersStore.getState().setSalesmen(all.map(mapSalesman));
            break;
          }
          case 'expenses': {
            const all = await localDb.expenses.toArray();
            useExpensesStore.getState().setExpenses(all.map(mapExpense));
            break;
          }
          case 'discounts': {
            const all = await localDb.discounts.toArray();
            useAppStore.getState().setDiscounts(all.map(mapDiscount));
            break;
          }
          case 'purchase_records': {
            const all = await localDb.purchaseRecords.toArray();
            useInventoryStore.getState().setPurchaseRecords(all.map(mapPurchaseRecord));
            break;
          }
          case 'bundles': {
            const all = await localDb.bundles.toArray();
            useAppStore.getState().setBundles(all);
            break;
          }
        }
      } catch (err) {
        console.error(`[CloudPull] Error refreshing state for ${entity}:`, err);
      }
    }
  }, []);

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
      if (forceCloudSync) {
        if (!navigator.onLine) {
          throw new Error('Cannot sync while offline');
        }
        if (isSyncEngineBusy()) {
          throw new Error('Sync engine is already busy. Please wait.');
        }
        
        sonner.loading('Syncing with cloud...', { id: 'load-data' });
        
        await pullCloudChanges(true);
      }

      // Load local data
      console.log('[loadData] Starting local data fetch...');
      const [
        localSettings,
        localProducts,
        localCustomers,
        localUsers,
        localSalesmen,
        localDiscounts,
        localSalesTabs,
        localCategories,
        localPaymentModes,
        localBundles,
        localSales,
        localExpenses,
        localPurchaseRecords,
        localPurchaseOrders,
        localSuppliers,
        localSupplierTx
      ] = await Promise.all([
        localDb.appSettings.toArray(),
        localDb.products.toArray(),
        localDb.customers.toArray(),
        localDb.users.toArray(),
        localDb.salesmen.toArray(),
        localDb.discounts.toArray(),
        localDb.salesTabs.toArray(),
        localDb.categories.toArray(),
        localDb.paymentModes.toArray(),
        localDb.bundles.toArray(),
        localDb.sales.orderBy('timestamp').reverse().limit(500).toArray(),
        localDb.expenses.toArray(),
        localDb.purchaseRecords.toArray(),
        localDb.purchaseOrders.toArray(),
        localDb.suppliers.toArray(),
        localDb.supplierTransactions.toArray()
      ]);
      
      console.log('[loadData] Local data fetch complete. Setting stores...');

      if (localSettings.length > 0) useSettingsStore.getState().setSettings(mapSettings(localSettings[0]));
      useProductsStore.getState().setProducts(localProducts.map(mapProduct));
      useCustomersStore.getState().setCustomers(localCustomers.map(mapCustomer));
      useUsersStore.getState().setUsers(localUsers.map(mapUser));
      useUsersStore.getState().setSalesmen(localSalesmen.map(mapSalesman));
      useAppStore.getState().setDiscounts(localDiscounts.map(mapDiscount));
      useCartStore.getState().setSalesTabs(localSalesTabs);
      useInventoryStore.getState().setCategories(localCategories);
      useSettingsStore.getState().setPaymentModes(localPaymentModes.map(mapPaymentMode));
      useAppStore.getState().setBundles(localBundles);
      useSalesStore.getState().setSales(localSales.map(mapSale));
      useExpensesStore.getState().setExpenses(localExpenses.map(mapExpense));
      useInventoryStore.getState().setPurchaseRecords(localPurchaseRecords.map(mapPurchaseRecord));
      useInventoryStore.getState().setPurchaseOrders(localPurchaseOrders);
      useInventoryStore.getState().setSuppliers(localSuppliers);
      useInventoryStore.getState().setSupplierTransactions(localSupplierTx);

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

  return { loadData, loadMoreSales, searchSales, handleCloudPullChanged };
}
