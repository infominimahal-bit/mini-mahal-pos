import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { MediaLibrary } from '../../../shared/MediaLibrary';
import { Button } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import type { Bundle, Product } from '../../../types';
import { emptyForm, type BundleForm } from './formTypes';
import { saveBundle } from './saveBundle';
import { FormBasics } from './FormBasics';
import { FormBadge } from './FormBadge';
import { FormSchedule } from './FormSchedule';
import { FormItems } from './FormItems';
import { FormToppings } from './FormToppings';

interface BundleFormProps {
  editingBundle: Bundle | null;
  products: Product[];
  appSettings: any;
  onClose: () => void;
}

function buildFormFromBundle(bundle: Bundle): BundleForm {
  const isCombo = Array.isArray(bundle.slots) && bundle.slots.length > 0;
  return {
    name: bundle.name || '',
    description: bundle.description || '',
    image: bundle.image || '',
    discountValue: bundle.discountValue || 0,
    discountType: bundle.discountType || 'percentage',
    overridePrice: bundle.overridePrice || 0,
    hideItemPrices: bundle.hideItemPrices || false,
    badgeEnabled: (bundle as any).badgeEnabled || false,
    badgeText: (bundle as any).badgeText || '',
    badgeIcon: (bundle as any).badgeIcon || 'crown',
    badgeBgColor: (bundle as any).badgeBgColor || '#1A1A1A',
    badgeTextColor: (bundle as any).badgeTextColor || '#D4AF37',
    isCombo: isCombo,
    scheduleType: bundle.scheduleType || 'always',
    startDate: bundle.startDate || '',
    endDate: bundle.endDate || '',
    repeatDays: bundle.repeatDays || [],
    startTime: bundle.startTime || '',
    endTime: bundle.endTime || '',
    items: (bundle.items || []).map(bi => ({ productId: bi.productId, quantity: bi.quantity })),
    slots: (bundle.slots || []).map(s => ({
      id: s.id,
      name: s.name,
      requiredQuantity: s.requiredQuantity,
      options: (s.options || []).map(o => ({ productId: o.productId, sortOrder: o.sortOrder ?? 0 })),
      toppingIds: []
    })).sort((a: any, b: any) => a.orderIndex - b.orderIndex),
    extraToppings: (bundle.extraToppings || []).map(et => ({
      id: et.id,
      name: et.name,
      priceSmall: et.priceSmall,
      priceMedium: et.priceMedium,
      priceLarge: et.priceLarge,
      active: et.active,
    })),
  };
}

export function BundleForm({ editingBundle, products, appSettings, onClose }: BundleFormProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState<BundleForm>(() =>
    editingBundle ? buildFormFromBundle(editingBundle) : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState<boolean | string>(false);
  const [showToppingEditor, setShowToppingEditor] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  useEffect(() => {
    setForm(editingBundle ? buildFormFromBundle(editingBundle) : emptyForm);
    setProductSearch('');
  }, [editingBundle]);

  const currencySymbol = formatCurrency(0, appSettings.currency).replace('0', '').trim();

  const filteredSearchProducts = products.filter(p =>
    p.active !== false &&
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addProduct = (product: Product) => {
    setForm(prev => {
      const existing = prev.items.find(i => i.productId === product.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...prev, items: [...prev.items, { productId: product.id, quantity: 1 }] };
    });
    setProductSearch('');
    setShowProductPicker(false);
  };

  const removeItem = (productId: string) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i.productId !== productId) }));
  };

  const updateQty = (productId: string, delta: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items
        .map(i => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
        .filter(i => i.quantity > 0),
    }));
  };

  const addOptionToSlot = (slotId: string, product: Product) => {
    setForm(prev => ({
      ...prev,
      slots: prev.slots.map(s => {
        if (s.id === slotId) {
          if (s.options.find(o => o.productId === product.id)) return s;
          const nextOrder = s.options.length;
          return { ...s, options: [...s.options, { productId: product.id, sortOrder: nextOrder }] };
        }
        return s;
      })
    }));
    setProductSearch('');
    setShowProductPicker(false);
  };

  const removeOptionFromSlot = (slotId: string, productId: string) => {
    setForm(prev => ({
      ...prev,
      slots: prev.slots.map(s => {
        if (s.id === slotId) {
          const filtered = s.options.filter(o => o.productId !== productId);
          return { ...s, options: filtered.map((o, i) => ({ ...o, sortOrder: i })) };
        }
        return s;
      })
    }));
  };

  const moveOption = (slotId: string, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setForm(prev => ({
      ...prev,
      slots: prev.slots.map(s => {
        if (s.id !== slotId) return s;
        const opts = [...s.options];
        const [moved] = opts.splice(fromIdx, 1);
        opts.splice(toIdx, 0, moved);
        return { ...s, options: opts.map((o, i) => ({ ...o, sortOrder: i })) };
      })
    }));
  };

  const bundleTotal = form.items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const discountAmount = form.discountType === 'percentage'
    ? (bundleTotal * form.discountValue) / 100
    : Math.min(form.discountValue, bundleTotal);

  const finalPrice = bundleTotal - discountAmount;

  const handleSave = () =>
    saveBundle({ form, editingBundle, products, setSaving, onClose, t });

  return (
    <div className="animate-in fade-in duration-300 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onClose} className="!min-h-0 !p-2 !rounded-xl !bg-transparent hover:!bg-gray-100 dark:hover:!bg-white/5" icon={<X className="h-4 w-4 text-gray-500" />} />
        <div>
          <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
            {editingBundle ? "Edit Bundle / Deal" : "New Bundle / Deal"}
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            {editingBundle ? "Update your existing combo deal" : "Create a deal with multiple products"}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-surface rounded-3xl border border-gray-200 dark:border-white/5 p-5 space-y-5 shadow-xl">

        <FormBasics
          form={form}
          setForm={setForm}
          currencySymbol={currencySymbol}
          bundleTotal={bundleTotal}
          onOpenMediaLibrary={() => setShowMediaLibrary(true)}
        />

        <FormBadge form={form} setForm={setForm} />

        <FormSchedule form={form} setForm={setForm} />

        {/* Items / Slots Builder */}
        <FormItems
          form={form}
          setForm={setForm}
          products={products}
          appSettings={appSettings}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          showProductPicker={showProductPicker}
          setShowProductPicker={setShowProductPicker}
          filteredSearchProducts={filteredSearchProducts}
          addProduct={addProduct}
          addOptionToSlot={addOptionToSlot}
          removeOptionFromSlot={removeOptionFromSlot}
          moveOption={moveOption}
          updateQty={updateQty}
          removeItem={removeItem}
        />

        {/* Live Preview */}
        {!form.isCombo && form.items.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-primary/20 rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary dark:text-emerald-400 mb-2">💰 {"Price Preview"}</p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-600 dark:text-gray-400 font-bold">{"Original Total"}</span>
              <span className="font-black text-gray-900 dark:text-white">{formatCurrency(bundleTotal, appSettings.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-red-500 font-bold">{"Discount"} ({form.discountValue}{form.discountType === 'percentage' ? '%' : ' ' + currencySymbol})</span>
              <span className="font-black text-red-500">− {formatCurrency(discountAmount, appSettings.currency)}</span>
            </div>
            <div className="h-px bg-primary/20 my-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-black text-gray-900 dark:text-white uppercase">{"Bundle Price"}</span>
              <span className="font-black text-primary dark:text-emerald-400 text-base">{formatCurrency(finalPrice, appSettings.currency)}</span>
            </div>
          </div>
        )}

        <FormToppings form={form} setForm={setForm} showToppingEditor={showToppingEditor} setShowToppingEditor={setShowToppingEditor} />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            className="flex-1 !min-h-[48px]"
            onClick={onClose}
          >
            {"Cancel"}
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            loading={saving}
            className="flex-1 !min-h-[48px] hover:shadow-emerald-500/40"
            onClick={handleSave}
          >
            {saving ? "Saving..." : editingBundle ? "Update Bundle" : "Create Bundle"}
          </Button>
        </div>
      </div>

      {showMediaLibrary && (
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={(url) => setForm(prev => ({ ...prev, image: url }))}
        />
      )}
    </div>
  );
}
