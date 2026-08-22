import { useCartStore } from '../../stores';
import { useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { useApp } from '../../context/SupabaseAppContext';
import { SalesTab } from '../../types';
import { salesTabsService } from '../../lib/services';
import { useAuth } from '../../context/AuthContext';
import { sonner } from '../../lib/sonner';

interface SalesTabManagerProps {
  showAddButton?: boolean;
}

export function SalesTabManager({ showAddButton = true }: SalesTabManagerProps) {
  const appSalesTabs = useCartStore(s => s.salesTabs);
const appActiveSalesTab = useCartStore(s => s.activeSalesTab);
const appCart = useCartStore(s => s.cart);
const appSelectedCustomer = useCartStore(s => s.selectedCustomer);

  const { user } = useAuth();

  const createNewTabRef = useRef<() => Promise<void>>();

  useEffect(() => {
    createNewTabRef.current = createNewTab;
  });

  useEffect(() => {
    const handleCreateTab = () => {
      createNewTabRef.current?.();
    };
    window.addEventListener('create-new-tab', handleCreateTab);
    return () => window.removeEventListener('create-new-tab', handleCreateTab);
  }, []);

  const createNewTab = async () => {
    if (!user) return;

    if (appSalesTabs.length >= 3) {
      sonner.warning('Maximum 3 Sale tabs allowed. Please close an existing tab first.');
      return;
    }

    try {
      // Save current tab's state before creating a new one
      if (appActiveSalesTab) {
        const currentTab = appSalesTabs.find(tab => tab.id === appActiveSalesTab);
        if (currentTab) {
          const updates = {
            cart: appCart,
            selectedCustomer: appSelectedCustomer,
          };

          await salesTabsService.update(appActiveSalesTab, updates);
          useCartStore.getState().updateSalesTab({
              id: appActiveSalesTab,
              updates
            });
        }
      }

      const maxSaleNumber = appSalesTabs.reduce((max, tab) => {
        const match = tab.name.match(/^Sale (\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);

      const newTabData: Omit<SalesTab, 'id' | 'createdAt'> = {
        name: `Sale ${maxSaleNumber + 1}`,
        cart: [],
        selectedCustomer: null,
      };

      const newTab = await salesTabsService.create(user.id, newTabData);
      useCartStore.getState().addSalesTab(newTab);
      useCartStore.getState().setActiveSalesTab(newTab.id);
    } catch (error) {
      console.error('Error creating new tab:', error);
    }
  };

  const closeTab = async (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent button
    if (appSalesTabs.length > 1) {
      try {
        const tabIndex = appSalesTabs.findIndex(t => t.id === tabId);
        const wasActive = appActiveSalesTab === tabId;

        // If closing the active tab, find a neighbor to switch to
        if (wasActive) {
          // P2: persist the live cart to the closing tab FIRST so it isn't discarded.
          const currentTab = appSalesTabs.find(tab => tab.id === tabId);
          if (currentTab) {
            const updates = { cart: appCart, selectedCustomer: appSelectedCustomer };
            await salesTabsService.update(tabId, updates);
            useCartStore.getState().updateSalesTab({ id: tabId, updates });
          }
          const nextTab = appSalesTabs[tabIndex - 1] || appSalesTabs[tabIndex + 1];
          if (nextTab) {
            useCartStore.getState().setActiveSalesTab(nextTab.id);
          }
        }

        await salesTabsService.delete(tabId);
        useCartStore.getState().removeSalesTab(tabId);
      } catch (error) {
        console.error('Error closing tab:', error);
      }
    }
  };

  const switchTab = async (tabId: string) => {
    // Save current cart to active tab
    if (appActiveSalesTab) {
      const currentTab = appSalesTabs.find(tab => tab.id === appActiveSalesTab);
      if (currentTab) {
        try {
          const updates = {
            cart: appCart,
            selectedCustomer: appSelectedCustomer,
          };

          await salesTabsService.update(appActiveSalesTab, updates);
          useCartStore.getState().updateSalesTab({
              id: appActiveSalesTab,
              updates
            });
        } catch (error) {
          console.error('Error saving current tab:', error);
        }
      }
    }

    useCartStore.getState().setActiveSalesTab(tabId);
  };

  const getItemCount = (tab: SalesTab) => {
    if (!tab?.cart) return 0;
    return tab.cart.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  };

  const TAB_COLORS = [
    { active: 'bg-primary shadow-emerald-500/50', light: 'bg-emerald-50 content-emerald-600', text: 'text-emerald-100' },
    { active: 'bg-blue-600 shadow-blue-500/50', light: 'bg-blue-50 content-blue-600', text: 'text-blue-100' },
    { active: 'bg-orange-600 shadow-orange-500/50', light: 'bg-orange-50 content-orange-600', text: 'text-orange-100' },
    { active: 'bg-purple-600 shadow-purple-500/50', light: 'bg-purple-50 content-purple-600', text: 'text-purple-100' },
    { active: 'bg-rose-600 shadow-rose-500/50', light: 'bg-rose-50 content-rose-600', text: 'text-rose-100' },
    { active: 'bg-teal-600 shadow-teal-500/50', light: 'bg-teal-50 content-teal-600', text: 'text-teal-100' },
  ];

  const getTabColor = (index: number) => TAB_COLORS[index % TAB_COLORS.length];

  return (
    <div className="flex items-center gap-0.5 lg:gap-1.5 py-0.5">
      {appSalesTabs.map((tab, index) => {
        const isActive = appActiveSalesTab === tab.id;
        const itemCount = getItemCount(tab);
        const tabNumber = index + 1;

        return (
          <div key={tab.id} className="flex-shrink-0 flex items-center">
            <button
              onClick={() => switchTab(tab.id)}
              style={{ minHeight: 'unset' }}
              className={`relative flex items-center h-4 min-h-0 px-1.5 lg:h-6 lg:px-3 rounded-md lg:rounded-lg text-[6px] lg:text-[8px] font-black uppercase tracking-[0.05em] transition-all duration-300 ${isActive
                  ? 'bg-primary text-white shadow-lg shadow-emerald-500/20 scale-105 z-10'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
            >
              <span>Tab {tabNumber}</span>
              {itemCount > 0 && (
                <span className={`ml-1 px-1 rounded-[3px] text-[5px] lg:text-[7px] ${isActive ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                  {itemCount}
                </span>
              )}
            </button>
            {appSalesTabs.length > 1 && isActive && (
              <button
                onClick={(e) => closeTab(tab.id, e)}
                style={{ minHeight: 'unset' }}
                className="ml-0.5 p-0.5 rounded-md min-h-0 text-gray-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
                title="Close Tab"
              >
                <X className="h-2 w-2 lg:h-2.5 lg:w-2.5" />
              </button>
            )}
          </div>
        );
      })}

      {showAddButton && appSalesTabs.length < 3 && (
        <div className="sticky right-0 bg-white dark:bg-app z-10 pl-1 py-1 flex items-center shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('create-new-tab'))}
            style={{ minHeight: 'unset' }}
            className="flex items-center justify-center w-4 h-4 min-h-0 lg:w-6 lg:h-6 rounded-md lg:rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 transition-colors"
            title="Add New Tab"
          >
            <Plus className="h-2.5 w-2.5 lg:h-3.5 lg:w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}