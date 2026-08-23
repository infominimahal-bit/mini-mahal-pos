import { useEffect } from 'react';
import { useCartStore, useSettingsStore } from '../stores';
import { salesTabsService } from '../lib/services';
import { useAuth } from './AuthContext';

export function useAppPersistence() {
  const { user } = useAuth();
  
  const appCart = useCartStore(s => s.cart);
  const appEditingSaleId = useCartStore(s => s.editingSaleId);
  const appSelectedCustomer = useCartStore(s => s.selectedCustomer);
  const appActiveSalesTab = useCartStore(s => s.activeSalesTab);
  const appSalesTabs = useCartStore(s => s.salesTabs);
  const appSettings = useSettingsStore(s => s.settings);
  const appBillDiscountValue = useCartStore(s => s.billDiscountValue);
  const appBillDiscountType = useCartStore(s => s.billDiscountType);

  // On mount: only restore things that are device-local (cart in active tab, editing ID)
  // Sales Tabs are loaded from cloud in useAppLoadData — do NOT load from localStorage here
  useEffect(() => {
    // Restore active tab selection (device-local preference only)
    const savedActiveTab = localStorage.getItem('pos_active_sales_tab');
    if (savedActiveTab) {
      // Will be used after salesTabs load from cloud in useAppLoadData
      // No need to call setActiveSalesTab here; useAppLoadData handles it
    }
  }, []);

  // Save active tab selection to localStorage (device-local only)
  useEffect(() => {
    if (appActiveSalesTab) {
      localStorage.setItem('pos_active_sales_tab', appActiveSalesTab);
    }
  }, [appActiveSalesTab]);

  // AUTO-PERSIST CART + TAB STATE TO CLOUD (Supabase)
  useEffect(() => {
    const activeTab = appSalesTabs.find(t => t.id === appActiveSalesTab);
    if (activeTab && user) {
      salesTabsService.update(activeTab.id, activeTab).catch(err => {
        console.error('Error background-saving sales tab:', err);
      });
    }
  }, [appCart, appSelectedCustomer, appBillDiscountValue, appBillDiscountType, appActiveSalesTab, user, appSalesTabs]);

  // Mirror settings to localStorage (only for offline/initial load fallback)
  useEffect(() => {
    if (appSettings && Object.keys(appSettings).length > 0) {
      // Only store device-local preferences (theme, grid columns)
      const localPrefs = {
        theme: appSettings.theme,
        posGridColumns: appSettings.posGridColumns,
      };
      localStorage.setItem('pos_local_prefs', JSON.stringify(localPrefs));
    }
  }, [appSettings?.theme, appSettings?.posGridColumns]);
}
