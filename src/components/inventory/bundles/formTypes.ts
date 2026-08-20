interface BundleFormItem {
  productId: string;
  quantity: number;
}

interface BundleFormSlotOption {
  productId: string;
  sortOrder?: number;
}

interface BundleFormSlot {
  id: string; // temp id for UI
  name: string;
  requiredQuantity: number;
  options: BundleFormSlotOption[];
  toppingIds: string[];
}

interface ExtraToppingForm {
  id: string;
  name: string;
  priceSmall: number;
  priceMedium: number;
  priceLarge: number;
  active: boolean;
}

interface BundleForm {
  name: string;
  description: string;
  image: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  hideItemPrices: boolean;
  isCombo: boolean;
  overridePrice: number;
  badgeEnabled: boolean;
  badgeText: string;
  badgeIcon: string;
  badgeBgColor: string;
  badgeTextColor: string;
  scheduleType: 'always' | 'scheduled';
  startDate: string;
  endDate: string;
  repeatDays: string[];
  startTime: string;
  endTime: string;
  items: BundleFormItem[];
  slots: BundleFormSlot[];
  extraToppings: ExtraToppingForm[];
}

const emptyForm: BundleForm = {
  name: '',
  description: '',
  image: '',
  discountValue: 0,
  discountType: 'percentage',
  overridePrice: 0,
  hideItemPrices: false,
  isCombo: false,
  badgeEnabled: false,
  badgeText: '',
  badgeIcon: 'crown',
  badgeBgColor: '#1A1A1A',
  badgeTextColor: '#D4AF37',
  scheduleType: 'always',
  startDate: '',
  endDate: '',
  repeatDays: [],
  startTime: '',
  endTime: '',
  items: [],
  slots: [],
  extraToppings: [],
};

export type {
  BundleFormItem,
  BundleFormSlotOption,
  BundleFormSlot,
  ExtraToppingForm,
  BundleForm,
};

export { emptyForm };
