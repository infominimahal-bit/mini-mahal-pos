/**
 * ============================================================================
 * calculateCart — SINGLE SOURCE OF TRUTH for cart math (MASTER §10)
 * ============================================================================
 * Pure function (no hooks, no React). Called by:
 *   - useCartCalculations (POS)
 *
 * Order: Line Total → Line Discount → Auto Promotions → Manual Bill Discount
 *        → Taxable Extra/Service Charges → Tax → Final Total.
 *
 * §10 mandate: one function, no second implementation anywhere.
 * ============================================================================
 */

import { roundTo2 } from './utils';
import { CartItem, AppliedDiscount } from '../types';

export interface CartCalculationInput {
  cart: CartItem[];
  /** Discounts list — optional */
  discounts?: any[];
  taxRate?: number;
  billDiscountValue?: number;
  billDiscountType?: 'percentage' | 'fixed';
  /** Extra charges: each item has amount + taxable flag */
  extraCharges?: Array<{ amount: number; taxable?: boolean }>;
  paymentMethod?: string;
  cardDetails?: any;
  selectedCustomer?: any;
  products?: CartItem['product'][];
  /** Injected eligibility checker to avoid circular dep */
  checkEligibility?: (d: any, cart: CartItem[], customer: any, pm: string, subtotal: number, cd: any) => boolean;
}

export interface CartCalculationResult {
  subtotal: number;
  manualItemDiscountTotal: number;
  autoPromotionAmount: number;
  billDiscountAmount: number;
  totalDiscount: number;
  taxableBase: number;
  taxAmount: number;
  total: number;
  totalCost: number;
  isBelowCost: boolean;
  activePromotions: AppliedDiscount[];
  freeGifts: CartItem[];
}

export function calculateCart(input: CartCalculationInput): CartCalculationResult {
  const {
    cart,
    discounts = [],
    taxRate = 0,
    billDiscountValue = 0,
    billDiscountType = 'fixed',
    extraCharges = [],
    paymentMethod = 'cash',
    cardDetails,
    selectedCustomer,
    checkEligibility,
  } = input;

  const manualItemDiscountTotal = roundTo2(cart.reduce((sum, item) => sum + (item.discount || 0), 0));
  const subtotalAfterItemDiscounts = roundTo2(cart.reduce((sum, item) => sum + (item.subtotal || 0), 0));
  const subtotal = roundTo2(subtotalAfterItemDiscounts + manualItemDiscountTotal);

  // Auto-promotions
  const activePromotions: AppliedDiscount[] = [];
  const freeGifts: CartItem[] = [];
  let autoPromotionAmount = 0;

  if (checkEligibility) {
    discounts.forEach(discount => {
      if (!checkEligibility(discount, cart, selectedCustomer, paymentMethod, subtotal, cardDetails)) return;
      if (discount.isAutoApply === false) return;

      let amount = 0;
      if (discount.type === 'percentage') {
        amount = roundTo2((subtotalAfterItemDiscounts * discount.value) / 100);
        if (discount.maxDiscount) amount = Math.min(amount, discount.maxDiscount);
      } else if (discount.type === 'fixed') {
        amount = discount.value;
      }
      if (amount > 0) {
        autoPromotionAmount = roundTo2(autoPromotionAmount + amount);
        activePromotions.push({ discountId: discount.id, discountName: discount.name, discountAmount: amount, type: discount.type });
      }
    });
  }

  // Manual bill discount — clamp so a discount can NEVER exceed the
  // remaining subtotal (prevents a negative sale total / billing leakage).
  const rawBillDiscount = roundTo2(
    billDiscountType === 'percentage'
      ? (subtotalAfterItemDiscounts * (billDiscountValue || 0)) / 100
      : (billDiscountValue || 0)
  );
  const billDiscountAmount = Math.max(0, Math.min(rawBillDiscount, subtotalAfterItemDiscounts));

  // Totals
  const totalDiscount = Math.max(0, Math.min(roundTo2(manualItemDiscountTotal + autoPromotionAmount + billDiscountAmount), subtotal));
  const taxableExtraTotal = roundTo2(extraCharges.filter(c => c.taxable !== false).reduce((s, c) => s + c.amount, 0));
  const nonTaxableExtraTotal = roundTo2(extraCharges.filter(c => c.taxable === false).reduce((s, c) => s + c.amount, 0));
  let taxableBase = roundTo2(subtotal - totalDiscount + taxableExtraTotal);
  if (subtotal >= 0) {
    taxableBase = Math.max(0, taxableBase); // Prevent discounts from causing negative totals on normal sales
  }
  const taxAmount = roundTo2(taxableBase * (taxRate / 100));
  const total = roundTo2(taxableBase + taxAmount + nonTaxableExtraTotal);

  const totalCost = roundTo2(
    cart.reduce((sum, item) => sum + ((item.product.cost || 0) * item.quantity), 0) +
    freeGifts.reduce((sum, g) => sum + ((g.product.cost || 0) * g.quantity), 0)
  );

  return {
    subtotal,
    manualItemDiscountTotal,
    autoPromotionAmount,
    billDiscountAmount,
    totalDiscount,
    taxableBase,
    taxAmount,
    total,
    totalCost,
    isBelowCost: total < totalCost,
    activePromotions,
    freeGifts,
  };
}
