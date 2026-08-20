import { Discount, DiscountCondition } from '../../types';
import { useAppStore } from '../../stores';
import { sonner } from '../../lib/sonner';

export interface DiscountFormData {
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_gift' | 'bogo' | 'mix_and_match';
  value: string;
  minAmount: string;
  maxDiscount: string;
  validFrom: string;
  validTo: string;
  active: boolean;
  isAutoApply: boolean;
}

export function createDiscountSubmit(params: {
  discount: Discount | null;
  onClose: () => void;
  formData: DiscountFormData;
  conditions: DiscountCondition[];
  freeGiftProducts: string[];
  validDays: number[];
}) {
  const { discount, onClose, formData, conditions, freeGiftProducts, validDays } = params;

  return async () => {
    if (!formData.name.trim()) {
      sonner.warning("discount_name_warning");
      return;
    }

    if (formData.type !== 'free_gift' && formData.type !== 'mix_and_match' && (!formData.value || parseFloat(formData.value) <= 0)) {
      sonner.warning("discount_value_warning");
      return;
    }

    if (!formData.validFrom || !formData.validTo) {
      sonner.warning("discount_dates_warning");
      return;
    }

    const specificProductsConditions = conditions.filter(c => c.type === 'specific_products');
    for (const condition of specificProductsConditions) {
      if (!condition.value || (Array.isArray(condition.value) && condition.value.length === 0)) {
        sonner.warning("discount_products_warning");
        return;
      }
      if (!condition.minQuantity || condition.minQuantity < 1) {
        sonner.warning("discount_qty_warning");
        return;
      }
    }

    const hasCardTypeCondition = conditions.some(c => c.type === 'card_type');
    const hasBankNameCondition = conditions.some(c => c.type === 'bank_name');
    const paymentMethodCondition = conditions.find(c => c.type === 'payment_method');

    if ((hasCardTypeCondition || hasBankNameCondition) && paymentMethodCondition && paymentMethodCondition.value !== 'card') {
      sonner.warning("card_warning_conflict");
      return;
    }

    if ((hasCardTypeCondition || hasBankNameCondition) && !paymentMethodCondition) {
      const result = await sonner.confirm(
        "card_warning_title",
        "card_warning_desc",
        "yes_confirm"
      );
      if (!result.isConfirmed) return;
    }

    const discountData: Discount = {
      id: discount?.id || Date.now().toString(),
      name: formData.name,
      description: formData.description,
      type: formData.type,
      value: (formData.type === 'free_gift' || formData.type === 'mix_and_match') ? 0 : parseFloat(formData.value),
      conditions,
      freeGiftProducts: formData.type === 'free_gift' ? freeGiftProducts : undefined,
      minAmount: formData.minAmount ? parseFloat(formData.minAmount) : undefined,
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
      validFrom: new Date(formData.validFrom),
      validTo: new Date(formData.validTo),
      validDays: validDays.length > 0 ? validDays : undefined,
      active: formData.active,
      isAutoApply: formData.isAutoApply,
      createdAt: discount?.createdAt || new Date(),
    };

    try {
      sonner.loading(discount ? "updating_discount" : "creating_discount");
      const { discountsService } = await import('../../lib/services');

      if (discount) {
        await discountsService.update(discount.id, discountData);
        useAppStore.getState().updateDiscount(discountData);
        sonner.success("discount_update_success");
      } else {
        const newDiscount = await discountsService.create(discountData);
        useAppStore.getState().addDiscount(newDiscount);
        sonner.success("discount_create_success");
      }

      onClose();
    } catch (error) {
      console.error('Error saving discount:', error);
      sonner.error("discount_save_error");
    } finally {
      sonner.close();
    }
  };
}

export function getCardConditionWarning(conditions: DiscountCondition[]) {
  const hasCardTypeCondition = conditions.some(c => c.type === 'card_type');
  const hasBankNameCondition = conditions.some(c => c.type === 'bank_name');
  const paymentMethodCondition = conditions.find(c => c.type === 'payment_method');

  if (hasCardTypeCondition || hasBankNameCondition) {
    if (paymentMethodCondition && paymentMethodCondition.value !== 'card') {
      return {
        type: 'error',
        message: "card_warning_conflict"
      };
    } else if (!paymentMethodCondition) {
      return {
        type: 'warning',
        message: "card_warning_no_method"
      };
    } else if (paymentMethodCondition.value === 'card') {
      return {
        type: 'info',
        message: "card_warning_success"
      };
    }
  }
  return null;
}
