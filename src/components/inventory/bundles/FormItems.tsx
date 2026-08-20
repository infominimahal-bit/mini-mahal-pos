import { Plus, Trash2, X, Gift, Info, Package } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { useDragDropList, DragHandle, SharedSearchBar, SharedProductList } from '../../../shared/modules/search-and-list';
import { formatCurrency } from '../../../lib/currencies';
import type { Product } from '../../../types';
import type { BundleForm, BundleFormSlotOption } from './formTypes';

interface ComboSlotOptionsProps {
  slotId: string;
  options: BundleFormSlotOption[];
  products: Product[];
  onReorder: (slotId: string, from: number, to: number) => void;
  onRemove: (slotId: string, productId: string) => void;
}

function ComboSlotOptions({ slotId, options, products, onReorder, onRemove }: ComboSlotOptionsProps) {
  const dnd = useDragDropList((from, to) => onReorder(slotId, from, to));

  return (
    <div className="flex flex-col gap-1">
      {options.map((opt, optIdx) => {
        const product = products.find(p => p.id === opt.productId);
        if (!product) return null;
        return (
          <div
            key={opt.productId}
            draggable
            onDragStart={() => dnd.handleDragStart(optIdx)}
            onDragEnter={() => dnd.handleDragEnter(optIdx)}
            onDragOver={dnd.handleDragOver}
            onDragEnd={dnd.handleDragEnd}
            className={`flex items-center gap-1.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 shadow-sm cursor-grab active:cursor-grabbing select-none ${dnd.rowCls(optIdx)}`}
          >
            <DragHandle className="w-5" />
            <span className="text-[9px] font-black text-gray-400 min-w-[16px]">#{optIdx + 1}</span>
            {product.image && (
              <img src={product.image} alt={product.name} className="w-4 h-4 object-cover rounded shadow-sm" />
            )}
            <span className="text-[10px] font-black text-gray-800 dark:text-gray-200 truncate">{product.name}</span>
            <Button type="button" variant="ghost" onClick={() => onRemove(slotId, opt.productId)} className="!min-h-0 !p-0 !bg-transparent !text-gray-400 hover:!text-red-500 ml-auto" icon={<X className="h-3 w-3" />} />
          </div>
        );
      })}
    </div>
  );
}

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
  addOptionToSlot: (slotId: string, product: Product) => void;
  removeOptionFromSlot: (slotId: string, productId: string) => void;
  moveOption: (slotId: string, fromIdx: number, toIdx: number) => void;
  updateQty: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
}

export function FormItems({
  form,
  setForm,
  products,
  appSettings,
  productSearch,
  setProductSearch,
  showProductPicker,
  setShowProductPicker,
  filteredSearchProducts,
  addProduct,
  addOptionToSlot,
  removeOptionFromSlot,
  moveOption,
  updateQty,
  removeItem,
}: FormItemsProps) {
  return !form.isCombo ? (
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
  ) : (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Deal Slots *</label>
        <Button type="button" variant="ghost" onClick={() => setForm(p => ({
          ...p,
          slots: [...p.slots, { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: `Slot ${p.slots.length + 1}`, requiredQuantity: 1, options: [], toppingIds: [] }]
        }))} className="!min-h-0 !p-0 !bg-transparent !text-[10px] !font-black !uppercase !tracking-widest !text-primary hover:!text-primary-dark" icon={<Plus className="h-3 w-3" />}>
          Add Slot
        </Button>
      </div>

      {form.slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-center">
          <Gift className="h-6 w-6 text-gray-400 mb-2" />
          <p className="text-[11px] font-black text-gray-600 dark:text-gray-400">No slots defined</p>
          <p className="text-[9px] text-gray-500 mt-1">Add a slot (e.g., "Choose 1 Pizza") to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {form.slots.map((slot) => (
            <div key={slot.id} className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-2xl p-4 space-y-4 relative">
              <Button type="button" variant="ghost" onClick={() => setForm(p => ({ ...p, slots: p.slots.filter(s => s.id !== slot.id) }))} className="absolute top-4 right-4 !min-h-0 !p-1.5 !bg-transparent !text-gray-400 hover:!text-red-500" icon={<Trash2 className="h-4 w-4" />} />

              <div className="grid grid-cols-2 gap-3 pr-8">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Slot Name</label>
                  <input type="text" value={slot.name} onChange={e => setForm(p => ({ ...p, slots: p.slots.map(s => s.id === slot.id ? { ...s, name: e.target.value } : s) }))} placeholder="e.g. Choose 1 Flavor" className="input w-full text-xs py-2" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Items to Pick</label>
                  <input type="number" min={1} value={slot.requiredQuantity} onChange={e => setForm(p => ({ ...p, slots: p.slots.map(s => s.id === slot.id ? { ...s, requiredQuantity: Math.max(1, parseInt(e.target.value) || 1) } : s) }))} className="input w-full text-xs py-2" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Options for this slot</label>
                <div className="relative mb-2">
                  <SharedSearchBar
                    value={showProductPicker === slot.id ? productSearch : ''}
                    onChange={val => {
                      setProductSearch(val);
                      setShowProductPicker(slot.id);
                    }}
                    onFocus={() => {
                      setProductSearch('');
                      setShowProductPicker(slot.id);
                    }}
                    placeholder="Search to add options..."
                  />
                  {showProductPicker === slot.id && productSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50">
                      <SharedProductList
                        items={filteredSearchProducts.slice(0, 8)}
                        onItemAdd={(id) => {
                          const p = products.find(x => x.id === id);
                          if (p) addOptionToSlot(slot.id, p);
                        }}
                        emptyStateText="No options found"
                        maxHeight={160}
                        className="rounded-xl shadow-xl"
                      />
                    </div>
                  )}
                </div>

                {slot.options.length > 0 ? (
                  <ComboSlotOptions
                    slotId={slot.id}
                    options={slot.options}
                    products={products}
                    onReorder={moveOption}
                    onRemove={removeOptionFromSlot}
                  />
                ) : (
                  <p className="text-[9px] text-red-500 italic mt-1">No options added yet. Customers won't be able to select anything.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
