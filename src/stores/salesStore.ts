import { create } from 'zustand';
import { Sale } from '../types';

interface SalesState {
  sales: Sale[];
  setSales: (s: Sale[]) => void;
  addSale: (s: Sale) => void;
  updateSale: (s: Sale) => void;
  deleteSale: (id: string) => void;
  appendSales: (s: Sale[]) => void;
}

export const useSalesStore = create<SalesState>((set) => ({
  sales: [],

  setSales: (sales) => set({ sales }),

  addSale: (sale) => set((st) => {
    if (st.sales.some((s) => s.id === sale.id)) return st;
    let customers = useCustomersStore.getState().customers;
    if (sale.customerId) {
      customers = customers.map((c) =>
        c.id === sale.customerId
          ? { ...c, totalPurchases: (c.totalPurchases || 0) + sale.total, lastPurchase: sale.total > 0 ? sale.timestamp : c.lastPurchase, updatedAt: new Date() }
          : c
      );
      useCustomersStore.setState({ customers });
    }
    return { sales: [...st.sales, sale] };
  }),

  updateSale: (sale) => set((st) => ({
    sales: st.sales.map((s) => (s.id === sale.id ? { ...s, ...sale } : s)),
  })),

  deleteSale: (saleId) => set((st) => {
    // BUG-H03: stock/customer reversals are handled by saleDelete service via
    // Dexie → productsStore sync. Do NOT mutate product/customer state here
    // (that would double-apply and drift the UI stock).
    return { sales: st.sales.filter((s) => s.id !== saleId) };
  }),

  appendSales: (items) => set((st) => {
    const existingIds = new Set(st.sales.map((s) => s.id));
    const newSales = items.filter((s) => !existingIds.has(s.id));
    return { sales: [...st.sales, ...newSales].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) };
  }),
}));

import { useCustomersStore } from './customersStore';
