import { create } from 'zustand';
import { Product } from '../types';

interface ProductsState {
  products: Product[];
  setProducts: (p: Product[]) => void;
  addProductsBulk: (p: Product[]) => void;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],

  setProducts: (products) => set({ products }),

  addProductsBulk: (items) => set((st) => ({ products: [...st.products, ...items] })),

  addProduct: (product) => set((st) =>
    st.products.some((p) => p.id === product.id) ? st : { products: [...st.products, product] }
  ),

  updateProduct: (product) => set((st) =>
    !product?.id ? st : { products: (st.products || []).map((p) => (p && p.id === product.id) ? product : p) }
  ),

  deleteProduct: (id) => {
    // also remove this product's purchase records (mirrors reducer DELETE_PRODUCT)
    const inv = useInventoryStore.getState();
    const remaining = inv.purchaseRecords.filter((r) => r.productId !== id);
    useInventoryStore.setState({ purchaseRecords: remaining });
    set((st) => ({ products: st.products.filter((p) => p.id !== id) }));
  },
}));

import { useInventoryStore } from './inventoryStore';
