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

  // Load from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('pos_cart');
    const savedEditId = localStorage.getItem('pos_editing_id');
    const savedCustomer = localStorage.getItem('pos_selected_customer');

    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (parsedCart.length > 0) useCartStore.getState().setCart(parsedCart);
      } catch (e) {
        console.error('[Persistence] Failed to parse cart', e);
      }
    }

    if (savedEditId) {
      useCartStore.getState().setEditingSaleId(savedEditId);
    }

    if (savedCustomer) {
      try {
        const parsedCustomer = JSON.parse(savedCustomer);
        useCartStore.getState().setSelectedCustomer(parsedCustomer);
      } catch (e) {
        console.error('[Persistence] Failed to parse customer', e);
      }
    }

    const savedSalesTabs = localStorage.getItem('pos_sales_tabs');
    const savedActiveTab = localStorage.getItem('pos_active_sales_tab');

    if (savedSalesTabs) {
      try {
        const parsedTabs = JSON.parse(savedSalesTabs);
        if (parsedTabs && parsedTabs.length > 0) {
          useCartStore.getState().setSalesTabs(parsedTabs);
        }
      } catch (e) {
        console.error('[Persistence] Failed to parse sales tabs', e);
      }
    }

    if (savedActiveTab) {
      useCartStore.getState().setActiveSalesTab(savedActiveTab);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(appCart));
    
    if (appEditingSaleId) {
      localStorage.setItem('pos_editing_id', appEditingSaleId);
    } else {
      localStorage.removeItem('pos_editing_id');
    }
    
    if (appSelectedCustomer) {
      localStorage.setItem('pos_selected_customer', JSON.stringify(appSelectedCustomer));
    } else {
      localStorage.removeItem('pos_selected_customer');
    }
    
    if (appActiveSalesTab) {
      localStorage.setItem('pos_active_sales_tab', appActiveSalesTab);
    }
    
    if (appSalesTabs && appSalesTabs.length > 0) {
      localStorage.setItem('pos_sales_tabs', JSON.stringify(appSalesTabs));
    }
  }, [appCart, appEditingSaleId, appSelectedCustomer, appActiveSalesTab, appSalesTabs]);

  // Theme mirroring removed as it overwrites local Cashier preference with global DB state

  // Mirror settings to localStorage
  useEffect(() => {
    if (appSettings && Object.keys(appSettings).length > 0) {
      localStorage.setItem('pos_settings', JSON.stringify(appSettings));
    }
  }, [appSettings]);

  // Validate active sales tab removed to prevent false resets when data is loading

  // AUTO-PERSIST ACTIVE TAB TO DB
  useEffect(() => {
    const activeTab = appSalesTabs.find(t => t.id === appActiveSalesTab);
    if (activeTab && user) {
      salesTabsService.update(activeTab.id, activeTab).catch(err => {
        console.error('Error background-saving sales tab:', err);
      });
    }
  }, [appCart, appSelectedCustomer, appBillDiscountValue, appBillDiscountType, appActiveSalesTab, user, appSalesTabs]);
}
