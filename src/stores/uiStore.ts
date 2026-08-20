import { create } from 'zustand';

interface UiState {
  pendingReturnTab: string | null;
  pendingReturnSaleId: string | null;
  pendingSearch: string | null;
  inventoryActiveTab: string;
  inventoryActiveCategory: string;
  lastProductHubId: string | null;
  inventoryPurchasesPage: number;
  setPendingReturnTab: (v: string | null) => void;
  setPendingReturnSaleId: (v: string | null) => void;
  setPendingSearch: (v: string | null) => void;
  setInventoryTab: (v: string) => void;
  setInventoryCategory: (v: string) => void;
  setLastProductHub: (v: string | null) => void;
  setInventoryPurchasesPage: (v: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  pendingReturnTab: null,
  pendingReturnSaleId: null,
  pendingSearch: null,
  inventoryActiveTab: typeof localStorage !== 'undefined' ? localStorage.getItem('pos_inventory_active_tab') || 'inventory' : 'inventory',
  inventoryActiveCategory: 'All',
  lastProductHubId: null,
  inventoryPurchasesPage: 1,

  setPendingReturnTab: (pendingReturnTab) => set({ pendingReturnTab }),
  setPendingReturnSaleId: (pendingReturnSaleId) => set({ pendingReturnSaleId }),
  setPendingSearch: (pendingSearch) => set({ pendingSearch }),
  setInventoryTab: (inventoryActiveTab) => {
    try { localStorage.setItem('pos_inventory_active_tab', inventoryActiveTab); } catch (_) { }
    set({ inventoryActiveTab });
  },
  setInventoryCategory: (inventoryActiveCategory) => set({ inventoryActiveCategory }),
  setLastProductHub: (lastProductHubId) => set({ lastProductHubId }),
  setInventoryPurchasesPage: (inventoryPurchasesPage) => set({ inventoryPurchasesPage }),
}));
