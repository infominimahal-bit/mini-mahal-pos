import { Plus, Trash2, X, Database } from 'lucide-react';
import { Button, SearchableSelect, Select } from '../../../shared/ui';
import type { ProductDetailController } from './useProductDetail';

export function ProductExtras({ d }: { d: ProductDetailController }) {
  const { t, modifiers, setModifiers, variants, productAddons, setProductAddons, appProducts, product } = d;

  return (
    <>
      <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase">{t('extra_toppings', 'Extra Toppings')}</h4>
            <p className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">{t('extra_toppings_sub', 'Add custom toppings with price for this product')}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setModifiers([...modifiers, { name: '', price: 0 }])}
            className="!min-h-0 !px-3 !py-1.5 !rounded-lg !text-[10px] !font-black !bg-white dark:!bg-black !border-gray-200 dark:!border-white/10 !text-primary hover:!border-primary"
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {t('add_extra_topping', 'Add Topping')}
          </Button>
        </div>

        {modifiers.length === 0 && (
          <p className="text-[10px] text-gray-500 italic">No extra toppings for this product. Add one below.</p>
        )}
        {modifiers.map((modifier, index) => (
          <div key={index} className="flex items-center gap-2 flex-wrap bg-white dark:bg-black/30 p-2 rounded-xl border border-gray-200 dark:border-white/5">
            <input
              type="text"
              placeholder="Name"
              value={modifier.name}
              onChange={(e) => {
                const newModifiers = [...modifiers];
                newModifiers[index].name = e.target.value;
                setModifiers(newModifiers);
              }}
              className="flex-1 min-w-[100px] bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-primary font-bold text-[10px] text-gray-900 dark:text-white"
            />
            <input
              type="number"
              placeholder="Price"
              value={modifier.price || ''}
              onChange={(e) => {
                const newModifiers = [...modifiers];
                newModifiers[index].price = parseFloat(e.target.value) || 0;
                setModifiers(newModifiers);
              }}
              className="w-24 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-primary font-bold text-center text-gray-900 dark:text-white text-[10px]"
            />
            {variants.length > 0 && variants.some(v => v.options && v.options.length > 0) && (
              <Select
                value={modifier.variantName || ''}
                onChange={(e) => {
                  const newModifiers = [...modifiers];
                  newModifiers[index].variantName = e.target.value || undefined;
                  setModifiers(newModifiers);
                }}
                className="!bg-gray-50 dark:!bg-black/40 !border !border-gray-200 dark:!border-white/10 !text-gray-600 dark:!text-gray-400 !rounded-lg !px-2 !text-[10px] !font-bold !min-w-[120px] sm:!w-auto !w-full"
              >
                <option value="">All Variants</option>
                {variants.flatMap(v => (v.options || []).map((opt: string) => `${v.name}: ${opt}`)).map(opt => (
                  <option key={opt} value={opt}>Only {opt}</option>
                ))}
              </Select>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const newModifiers = [...modifiers];
                newModifiers.splice(index, 1);
                setModifiers(newModifiers);
              }}
              className="!min-h-0 !p-1.5 !rounded-lg !bg-red-50 dark:!bg-red-500/10 !text-red-500 hover:!bg-red-100 dark:hover:!bg-red-500/20 shrink-0"
              icon={<Trash2 className="w-4 h-4" />}
            />
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase">Linked Add-ons</h4>
            <p className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">Attach inventory-tracked products as extras</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setProductAddons([...productAddons, { id: '', productId: product?.id || '', addonProductId: '', name: '', price: 0, maxQty: 1, active: true, createdAt: new Date() }])}
            className="!min-h-0 !px-3 !py-1.5 !rounded-lg !text-[10px] !font-black !bg-white dark:!bg-black !text-blue-600 dark:!text-blue-500 !border-gray-200 dark:!border-white/10 hover:!border-blue-500"
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Link
          </Button>
        </div>

        {productAddons.map((addon, index) => (
          <div key={index} className="flex flex-col sm:flex-row gap-2.5 p-3 bg-white dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/5 items-center">
            <div className="w-full sm:flex-1 min-w-0">
              <SearchableSelect
                options={appProducts.filter(p => p.id !== product?.id).map(p => ({
                  id: p.id,
                  label: `${p.name} (Stock: ${p.stock})`,
                  image: p.image,
                  sublabel: p.category
                }))}
                value={addon.addonProductId}
                onChange={(val) => {
                  const selProd = appProducts.find(p => p.id === val);
                  const newAddons = [...productAddons];
                  newAddons[index].addonProductId = val;
                  if (selProd) {
                    newAddons[index].name = selProd.name;
                    newAddons[index].price = selProd.price;
                  }
                  setProductAddons(newAddons);
                }}
                placeholder="Search Product to Link..."
                icon={Database}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
              <div className="relative flex-1 sm:flex-none w-full sm:w-24">
                 <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold z-10 uppercase">Max</span>
                 <input
                   type="number"
                   min="1"
                   value={addon.maxQty || ''}
                   onChange={(e) => {
                     const newAddons = [...productAddons];
                     newAddons[index].maxQty = parseInt(e.target.value) || 1;
                     setProductAddons(newAddons);
                   }}
                   className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg pl-11 pr-2 py-1.5 focus:ring-1 focus:ring-blue-500 font-bold text-gray-900 dark:text-white text-xs text-right sm:text-left"
                 />
              </div>
              <div className="relative flex-1 sm:flex-none w-full sm:w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold z-10 uppercase">Price</span>
                <input
                  type="number"
                  placeholder="0"
                  value={addon.price === 0 ? '' : addon.price}
                  onChange={(e) => {
                    const newAddons = [...productAddons];
                    newAddons[index].price = parseFloat(e.target.value) || 0;
                    setProductAddons(newAddons);
                  }}
                  className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg pl-12 pr-2 py-1.5 focus:ring-1 focus:ring-blue-500 font-bold text-gray-900 dark:text-white text-xs text-right sm:text-left"
                />
              </div>
              <Button type="button" variant="ghost" onClick={() => setProductAddons(productAddons.filter((_, i) => i !== index))} className="!min-h-0 !p-1.5 !rounded-lg !bg-transparent !text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 shrink-0 mt-0.5" icon={<X className="w-4 h-4" />} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
