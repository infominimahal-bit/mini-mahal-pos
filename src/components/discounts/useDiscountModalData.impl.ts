import { useProductsStore, useSettingsStore } from '../../stores';
import { useState, useEffect, useMemo } from 'react';
import { Discount, DiscountCondition } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { SharedItem } from '../../shared/modules/search-and-list';
import { createDiscountSubmit, getCardConditionWarning } from './discountSubmit';

export function useDiscountModalData(discount: Discount | null, onClose: () => void) {
  const appProducts = useProductsStore(s => s.products);
  const appSettings = useSettingsStore(s => s.settings);

  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'free_gift' | 'bogo' | 'mix_and_match',
    value: '',
    minAmount: '',
    maxDiscount: '',
    validFrom: '',
    validTo: '',
    active: true,
    isAutoApply: true,
  });
  const [conditions, setConditions] = useState<DiscountCondition[]>([]);
  const [freeGiftProducts, setFreeGiftProducts] = useState<string[]>([]);
  const [validDays, setValidDays] = useState<number[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const pickerProducts = useMemo<SharedItem[]>(() => {
    const term = productSearch.trim().toLowerCase();
    const base = appProducts.filter(p => {
      if (!term) return true;
      return (
        (p.name || '').toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term) ||
        (p.barcode || '').toLowerCase().includes(term)
      );
    });
    return base.slice(0, 40).map(p => ({
      id: p.id,
      thumbnailUrl: p.image || undefined,
      badgeLabel: p.category || 'GENERAL',
      sku: p.sku || 'N/A',
      title: p.name,
      stock: p.stock,
    }));
  }, [appProducts, productSearch]);

  const toggleConditionProduct = (index: number, productId: string) => {
    const condition = conditions[index];
    const current: string[] = Array.isArray(condition.value) ? condition.value : [];
    const next = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId];
    updateCondition(index, 'value', next);
  };

  useEffect(() => {
    if (discount) {
      setFormData({
        name: discount.name,
        description: discount.description,
        type: discount.type,
        value: discount.value.toString(),
        minAmount: discount.minAmount?.toString() || '',
        maxDiscount: discount.maxDiscount?.toString() || '',
        validFrom: new Date(discount.validFrom).toLocaleDateString('en-CA'),
        validTo: new Date(discount.validTo).toLocaleDateString('en-CA'),
        active: discount.active,
        isAutoApply: discount.isAutoApply ?? true,
      });
      setConditions((discount.conditions || []).map(condition =>
        condition.type === 'specific_products' && !condition.minQuantity
          ? { ...condition, minQuantity: 1 }
          : condition
      ));
      setFreeGiftProducts(discount.freeGiftProducts || []);
      setValidDays(discount.validDays || []);
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'percentage',
        value: '',
        minAmount: '',
        maxDiscount: '',
        validFrom: new Date().toLocaleDateString('en-CA'),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
        active: true,
        isAutoApply: true,
      });
      setConditions([]);
      setFreeGiftProducts([]);
      setValidDays([]);
    }
  }, [discount]);

  const handleSubmit = createDiscountSubmit({ discount, onClose, formData, conditions, freeGiftProducts, validDays });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const addCondition = () => {
    setConditions(prev => [...prev, {
      type: 'min_amount',
      value: '',
      operator: 'greater_than'
    }]);
  };

  const updateCondition = (index: number, field: keyof DiscountCondition, value: any) => {
    setConditions(prev => prev.map((condition, i) => {
      if (i === index) {
        const updatedCondition = { ...condition, [field]: value };

        if (field === 'type' && value === 'specific_products' && !updatedCondition.minQuantity) {
          updatedCondition.minQuantity = 1;
        }

        return updatedCondition;
      }
      return condition;
    }));
  };

  const removeCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDay = (day: number) => {
    setValidDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const toggleProduct = (productId: string) => {
    setFreeGiftProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const cardConditionWarning = getCardConditionWarning(conditions);

  return {
    appSettings,
    formData,
    setFormData,
    conditions,
    setConditions,
    freeGiftProducts,
    setFreeGiftProducts,
    validDays,
    setValidDays,
    productSearch,
    setProductSearch,
    pickerProducts,
    toggleConditionProduct,
    handleSubmit,
    handleChange,
    addCondition,
    updateCondition,
    removeCondition,
    toggleDay,
    toggleProduct,
    cardConditionWarning,
    t,
  };
}
