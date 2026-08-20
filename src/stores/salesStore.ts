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
    const saleToDelete = st.sales.find((s) => s.id === saleId);
    let customers = useCustomersStore.getState().customers;
    const updatedProducts = [...useProductsStore.getState().products];

    if (saleToDelete && saleToDelete.customerId) {
      const remainingTotal = saleToDelete.total - (saleToDelete.refundedAmount || 0);
      customers = customers.map((c) =>
        c.id === saleToDelete.customerId
          ? { ...c, totalPurchases: Math.max(0, (c.totalPurchases || 0) - remainingTotal), updatedAt: new Date() }
          : c
      );
      useCustomersStore.setState({ customers });
    }

    if (saleToDelete && saleToDelete.status === 'completed') {
      saleToDelete.items.forEach((item) => {
        const productIdx = updatedProducts.findIndex((p) => p.id === item.product.id);
        if (productIdx >= 0 && updatedProducts[productIdx].trackInventory !== false) {
          const qty = (item.weight || item.quantity) - (item.refundedQuantity || 0);
          if (qty > 0) {
            const updatedProduct = { ...updatedProducts[productIdx] };
            updatedProduct.stock = (updatedProduct.stock || 0) + qty;
            updatedProducts[productIdx] = updatedProduct;
          }
        }
        if (item.addonItems && item.addonItems.length > 0) {
          item.addonItems.forEach((addonItem) => {
            const addonIdx = updatedProducts.findIndex((p) => p.id === addonItem.addon.addonProductId);
            if (addonIdx >= 0 && updatedProducts[addonIdx].trackInventory !== false) {
              const addonQty = (addonItem.quantity * item.quantity) - (item.refundedQuantity ? addonItem.quantity * item.refundedQuantity : 0);
              if (addonQty > 0) {
                const updatedAddonProduct = { ...updatedProducts[addonIdx] };
                updatedAddonProduct.stock = (updatedAddonProduct.stock || 0) + addonQty;
                updatedProducts[addonIdx] = updatedAddonProduct;
              }
            }
          });
        }
      });
      useProductsStore.setState({ products: updatedProducts });
    }

    return { sales: st.sales.filter((s) => s.id !== saleId) };
  }),

  appendSales: (items) => set((st) => {
    const existingIds = new Set(st.sales.map((s) => s.id));
    const newSales = items.filter((s) => !existingIds.has(s.id));
    return { sales: [...st.sales, ...newSales].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) };
  }),
}));

import { useCustomersStore } from './customersStore';
import { useProductsStore } from './productsStore';
