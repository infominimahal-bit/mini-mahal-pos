import { create } from 'zustand';
import { Discount, Bundle, ProductAddon } from '../types';

interface AppUiState {
  discounts: Discount[];
  bundles: Bundle[];
  productAddons: ProductAddon[];
  setDiscounts: (d: Discount[]) => void;
  addDiscount: (d: Discount) => void;
  updateDiscount: (d: Discount) => void;
  deleteDiscount: (id: string) => void;
  setBundles: (b: Bundle[]) => void;
  addBundle: (b: Bundle) => void;
  updateBundle: (b: Bundle) => void;
  deleteBundle: (id: string) => void;
  setProductAddons: (a: ProductAddon[]) => void;
}

export const useAppStore = create<AppUiState>((set) => ({
  discounts: [],
  bundles: [],
  productAddons: [],

  setDiscounts: (discounts) => set({ discounts }),
  addDiscount: (discount) => set((st) =>
    st.discounts.some((d) => d.id === discount.id) ? st : { discounts: [...st.discounts, discount] }
  ),
  updateDiscount: (discount) => set((st) =>
    !discount?.id ? st : { discounts: (st.discounts || []).map((d) => (d && d.id === discount.id) ? discount : d) }
  ),
  deleteDiscount: (id) => set((st) => ({ discounts: st.discounts.filter((d) => d.id !== id) })),

  setBundles: (bundles) => set({ bundles }),
  addBundle: (bundle) => set((st) =>
    st.bundles.some((b) => b.id === bundle.id) ? st : { bundles: [bundle, ...st.bundles] }
  ),
  updateBundle: (bundle) => set((st) =>
    ({ bundles: st.bundles.map((b) => (b.id === bundle.id ? bundle : b)) })
  ),
  deleteBundle: (id) => set((st) => ({ bundles: st.bundles.filter((b) => b.id !== id) })),

  setProductAddons: (productAddons) => set({ productAddons }),
}));
