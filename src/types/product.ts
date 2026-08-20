import { BundleItem } from './bundle';
import { BundleSlotOption } from './bundle';

export interface ProductVariant {
  name: string;      // e.g. "Size", "Color"
  options: string[]; // e.g. ["S", "M", "L"], ["Red", "Blue"]
  optionsRaw?: string; // transient raw input string to support smooth comma typing
}

export interface VariantData {
  id: string;
  option1: string; // e.g. "Size: 10 Inch"
  option2?: string; // e.g. "Color: Red"
  option3?: string; // e.g. "Material: Cotton"
  priceOverride?: number; // Sets exact price (Restaurant)
  priceDifference?: number; // Adjusts base price (+450)
  stock?: number; // Specific variant stock (Garments)
  trackInventory?: boolean; // Whether to independently track stock for this variant
  barcode?: string; // Variant barcode
  sku?: string;
  cardTitle?: string; // Display label for variant in UI (e.g. "10 Inch")
  cardSubtitle?: string; // Secondary display label (e.g. "Red")
  cost?: number; // Cost price of the specific variant
}

export interface ProductModifier {
  name: string;      // e.g. "Extra Cheese"
  price: number;     // e.g. 150
  variantName?: string; // e.g. "Size: 13 Inch" - Only applies to this variant
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  barcodeValue?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  targetStock?: number;
  category: string;
  supplier?: string;
  description: string;
  image?: string;
  taxable: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  isFeatured?: boolean;
  menuNumber?: number;
  highlightTag?: 'sunday' | 'crown';
  // New fields for advanced features
  isWeightBased?: boolean;
  pricePerUnit?: number; // For weight-based pricing (per kg, per lb, etc.)
  unit?: string; // kg, lb, piece, etc.
  // batches: legacy simple-stock batch helper (deprecated but ProductModal still uses it)
  batches?: ProductBatch[];
  trackInventory?: boolean; // Whether to track and manage inventory for this product
  variants?: ProductVariant[];
  variantData?: VariantData[]; // Advanced variant pricing, stock, barcodes
  modifiers?: ProductModifier[];
  productType?: 'simple' | 'variable' | 'variation';
  parentId?: string;
  isService?: boolean;
  requireSerial?: boolean;
  productAddons?: ProductAddon[]; // Inventory-tracked linked add-ons
}

export interface ProductBatch {
  id: string;
  productId?: string;
  quantity?: number;
  qtyRemaining?: number;
  qty_remaining?: number;
  cost?: number;
  price?: number;
  expiryDate?: string;
  batchNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  createdAt?: Date;
}

export interface VariantStockHistory {
  id: string;
  productId: string;
  variantId: string;
  variantLabel?: string;
  changeQty: number;
  type: 'sale' | 'return' | 'adjustment' | 'initial' | 'purchase';
  referenceId?: string;
  note?: string;
  balanceAfter?: number;
  cashierName?: string;
  createdAt: Date;
}

export interface ProductAddon {
  id: string;
  productId: string;
  addonProductId: string;
  name: string;
  price: number;
  maxQty: number;
  active: boolean;
  createdAt: Date;
}

export interface Topping {
  id: string;
  name: string;
  priceSmall: number;
  priceMedium: number;
  priceLarge: number;
  createdAt: Date;
}

export interface CartItemTopping {
  toppingId: string;
  name: string;
  price: number;
}

export interface ProductTopping {
  id: string;
  productId: string;
  toppingId: string;
}