import { useMemo } from 'react';
import { calculateCart } from '../lib/calculateCart';
import { checkDiscountEligibility } from '../lib/discountUtils';
import { useCartStore, useSettingsStore, useAppStore, useProductsStore } from '../stores';

export function useCartCalculations(paymentMethod: string = 'cash', cardDetails?: any) {
  const cart = useCartStore(s => s.cart);
  const selectedCustomer = useCartStore(s => s.selectedCustomer);
  const billDiscountValue = useCartStore(s => s.billDiscountValue);
  const billDiscountType = useCartStore(s => s.billDiscountType);
  
  const settings = useSettingsStore(s => s.settings);
  const discounts = useAppStore(s => s.discounts);
  const products = useProductsStore(s => s.products);

  return useMemo(() => {
    return calculateCart({
      cart,
      discounts,
      taxRate: settings.taxRate || 0,
      billDiscountValue: billDiscountValue || 0,
      billDiscountType: billDiscountType || 'fixed',
      paymentMethod,
      cardDetails,
      selectedCustomer,
      products,
      checkEligibility: checkDiscountEligibility,
    });
  }, [cart, discounts, selectedCustomer, settings, billDiscountValue, billDiscountType, paymentMethod, cardDetails, products]);
}
