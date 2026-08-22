interface BundleFormItem {
  productId: string;
  quantity: number;
}

interface BundleForm {
  name: string;
  description: string;
  image: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  hideItemPrices: boolean;
  overridePrice: number;
  items: BundleFormItem[];
}

const emptyForm: BundleForm = {
  name: '',
  description: '',
  image: '',
  discountValue: 0,
  discountType: 'percentage',
  overridePrice: 0,
  hideItemPrices: false,
  items: [],
};

export type {
  BundleFormItem,
  BundleForm,
};

export { emptyForm };
