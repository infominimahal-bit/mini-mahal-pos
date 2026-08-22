import { X, Info, Package } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { SharedSearchBar, SharedProductList } from '../../../shared/modules/search-and-list';
import { formatCurrency } from '../../../lib/currencies';
import type { Product } from '../../../types';
import type { BundleForm } from './formTypes';

interface FormItemsProps {
  form: BundleForm;
  setForm: (updater: (prev: BundleForm) => BundleForm) => void;
  products: Product[];
  appSettings: any;
  productSearch: string;
  setProductSearch: (val: string) => void;
  showProductPicker: boolean | string;
  setShowProductPicker: (val: boolean | string) => void;
  filteredSearchProducts: Product[];
  addProduct: (product: Product) => void;
  updateQty: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
}

export function FormItems({
  form,
  products,
  appSettings,
  productSearch,
  setProductSearch,
  showProductPicker,
  setShowProductPicker,
  filteredSearchProducts,
  addProduct,
  updateQty,
  removeItem,
}: FormItemsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{"Products in Bundle *"}</label>
        <span className="text-[9px] font-black text-gray-400">
          {"{count} products".replace('{count}', String(form.items.length))}
        </span>
      </div>

      {/* Product search — shared module */}
      <div className="relative mb-3">
        <SharedSearchBar
          value={showProductPicker === true ? productSearch : ''}
          onChange={val => { setProductSearch(val); setShowProductPicker(true); }}
          onFocus={() => { setProductSearch(''); setShowProductPicker(true); }}
          placeholder={"Search product name..."}
        />
        {showProductPicker === true && productSearch && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50">
            <SharedProductList
              items={filteredSearchProducts.slice(0, 8)}
              onItemAdd={(id) => {
                const p = products.find(x => x.id === id);
                if (p) addProduct(p);
              }}
              emptyStateText={"No product found"}
              maxHeight={192}
              className="rounded-2xl shadow-xl"
            />
          </div>
        )}
      </div>

      {/* Selected items */}
      {form.items.length === 0 ? (
        <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
          <Info className="h-4 w-4 text-gray-400 shrink-0" />
          <p className="text-[11px] text-gray-400">{"Search and add products above"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {form.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return null;
            return (
              <div key={item.productId} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5">
                <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  {product.image ? <img src={product.image} className="h-full w-full rounded-lg object-cover" /> : <Package className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate">{product.name}</p>
                  <p className="text-[9px] text-gray-500">{formatCurrency(product.price * item.quantity, appSettings.currency)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" onClick={() => updateQty(item.productId, -1)} className="!min-h-0 !w-6 !h-6 !p-0 !rounded-lg !bg-gray-200 dark:!bg-white/10 !text-gray-600 hover:!bg-red-100 dark:hover:!bg-red-500/10 hover:!text-red-500 !text-sm !font-black active:!scale-100">−</Button>
                  <span className="w-6 text-center text-[11px] font-black text-gray-900 dark:text-white">{item.quantity}</span>
                  <Button type="button" variant="ghost" onClick={() => updateQty(item.productId, 1)} className="!min-h-0 !w-6 !h-6 !p-0 !rounded-lg !bg-gray-200 dark:!bg-white/10 !text-primary hover:!bg-emerald-100 dark:hover:!bg-primary/10 !text-sm !font-black active:!scale-100">+</Button>
                </div>
                <Button type="button" variant="ghost" onClick={() => removeItem(item.productId)} className="!min-h-0 !p-1 !bg-transparent !text-gray-400 hover:!text-red-500" icon={<X className="h-3.5 w-3.5" />} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
