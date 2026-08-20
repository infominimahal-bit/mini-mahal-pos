import { Discount, DiscountCondition, CartItem, Customer } from '../types';

export function checkDiscountEligibility(
  discount: Discount,
  cart: CartItem[],
  customer: Customer | null,
  paymentMethod: string,
  total: number,
  cardDetails?: { cardType?: string; bankName?: string }
): boolean {
  if (!discount.active) return false;

  const now = new Date();
  if (now < discount.validFrom || now > discount.validTo) return false;

  if (discount.validDays && discount.validDays.length > 0) {
    const currentDay = now.getDay();
    if (!discount.validDays.includes(currentDay)) return false;
  }

  for (const condition of discount.conditions) {
    if (!checkCondition(condition, cart, customer, paymentMethod, total, cardDetails)) {
      return false;
    }
  }

  return true;
}

function checkCondition(
  condition: DiscountCondition,
  cart: CartItem[],
  customer: Customer | null,
  paymentMethod: string,
  total: number,
  cardDetails?: { cardType?: string; bankName?: string }
): boolean {
  switch (condition.type) {
    case 'min_amount':
      return total >= condition.value;
    case 'specific_products': {
      if (!Array.isArray(condition.value)) return false;
      const minQuantity = condition.minQuantity || 1;
      for (const productId of condition.value) {
        const cartItem = cart.find(item => item.product.id === productId);
        if (!cartItem) return false;
        if (cartItem.quantity < minQuantity) return false;
      }
      return true;
    }
    case 'payment_method':
      return paymentMethod === condition.value;
    case 'customer_tier':
      return customer?.priceTier === condition.value;
    case 'card_type':
      return paymentMethod === 'card' && cardDetails?.cardType === condition.value;
    case 'bank_name':
      return paymentMethod === 'card' && cardDetails?.bankName === condition.value;
    default:
      return true;
  }
}

export function getDiscountIneligibilityReason(
  discount: Discount,
  cart: CartItem[],
  customer: Customer | null,
  paymentMethod: string,
  total: number,
  cardDetails?: { cardType?: string; bankName?: string }
): string | null {
  if (!discount.active) return 'Discount is inactive';
  const now = new Date();
  if (now < discount.validFrom) return 'Not started yet';
  if (now > discount.validTo) return 'Expired';
  if (discount.validDays && discount.validDays.length > 0) {
    const currentDay = now.getDay();
    if (!discount.validDays.includes(currentDay)) return 'Not valid on this day';
  }
  for (const condition of discount.conditions) {
    const reason = getConditionIneligibilityReason(condition, cart, customer, paymentMethod, total, cardDetails);
    if (reason) return reason;
  }
  return null;
}

function getConditionIneligibilityReason(
  condition: DiscountCondition,
  cart: CartItem[],
  customer: Customer | null,
  paymentMethod: string,
  total: number,
  cardDetails?: { cardType?: string; bankName?: string }
): string | null {
  switch (condition.type) {
    case 'min_amount':
      return total >= condition.value ? null : `Min ${condition.value} required`;
    case 'specific_products': {
      if (!Array.isArray(condition.value)) return 'Invalid product condition';
      const minQuantity = condition.minQuantity || 1;
      for (const productId of condition.value) {
        const cartItem = cart.find(item => item.product.id === productId);
        if (!cartItem) return 'Specific products required';
        if (cartItem.quantity < minQuantity) return `Need ${minQuantity}+ of required product`;
      }
      return null;
    }
    case 'payment_method':
      return paymentMethod === condition.value ? null : `Payment: ${condition.value} only`;
    case 'customer_tier':
      return customer?.priceTier === condition.value ? null : `Tier: ${condition.value} only`;
    case 'card_type':
      return paymentMethod === 'card' && cardDetails?.cardType === condition.value ? null : `Card: ${condition.value} only`;
    case 'bank_name':
      return paymentMethod === 'card' && cardDetails?.bankName === condition.value ? null : `Bank: ${condition.value} only`;
    default:
      return null;
  }
}
