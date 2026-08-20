import { Product } from '../../../types';

export interface DetailCtx {
  product: Product;
  profile: any;
  currency: string;
  t: (key: string, fallback?: string) => string;
  appSuppliers: any[];
  isUpdating: boolean;
  isEditMode: boolean;
  showStockIn: boolean;
  formData: any;
  variants: any[];
  variantData: any[];
  modifiers: any[];
  productAddons: any[];
  toppingIds: string[];
  adjustmentData: any;
  restockData: any;
  setIsUpdating: (v: boolean) => void;
  setIsEditMode: (v: boolean) => void;
  setFormData: (updater: (prev: any) => any) => void;
  setShowAdjustment: (v: boolean) => void;
  setAdjustmentData: (v: any) => void;
  setShowRestock: (v: boolean) => void;
  setRestockData: (v: any) => void;
  setShowStockIn: (v: boolean) => void;
}
