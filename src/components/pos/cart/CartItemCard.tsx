import { useState } from 'react';
import { Minus, Plus, Trash2, Package, AlertCircle, Edit2, X } from 'lucide-react';
import { useCartStore } from '../../../stores';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { CartItem } from '../../../types';

interface CartItemCardProps {
  item: CartItem;
  index: number;
  visualIndex?: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onApplyDiscount: (index: number, discount: number, type: 'percentage' | 'fixed') => void;
  currency: string;
  profile: any;
  showDiscount: boolean;
  isNested?: boolean;
  isFromBundle?: boolean;
  baseQuantity?: number;
}

function CartItemCard({ item, index, visualIndex, onUpdateQuantity, onRemove, onApplyDiscount, currency, profile, showDiscount, isNested, isFromBundle, baseQuantity }: CartItemCardProps) {
  const hidePrices = item.bundleHideItemPrices === true;
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');

  const handleDiscountSubmit = () => {
    const value = parseFloat(discountValue);
    if (!isNaN(value) && value > 0) {
      onApplyDiscount(index, value, discountType);
      setShowDiscountInput(false);
      setDiscountValue('');
    }
  };

  const handlePriceSubmit = () => {
    const newPrice = parseFloat(tempPrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      const toppingsTotal = (item.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
      const updatedProduct = { ...item.product, price: newPrice };
      const quantityTotal = (newPrice + toppingsTotal) * item.quantity;
      const calculatedDiscount =
        item.discountValue && item.discountValue > 0
          ? item.discountType === 'percentage'
            ? (quantityTotal * item.discountValue) / 100
            : item.discountValue
          : 0;
      useCartStore.getState().updateCartItem({ index, item: { ...item, product: updatedProduct, discount: calculatedDiscount, subtotal: quantityTotal - calculatedDiscount } },);
    }
    setIsEditingPrice(false);
  };

  const clearItemDiscount = () => {
    const toppingsTotal = (item.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
    useCartStore.getState().updateCartItem({
        index,
        item: {
          ...item,
          discount: 0,
          discountValue: 0,
          subtotal: (item.product.price + toppingsTotal) * item.quantity,
        },
      },);
    setShowDiscountInput(false);
    setDiscountValue('');
  };
  return (
    <div className={`group hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors overflow-hidden ${isNested ? 'pl-0 pr-1 py-0.5 hover:bg-transparent dark:hover:bg-transparent' : isFromBundle ? 'pl-3 pr-4 py-1' : 'pl-3 pr-4 py-1.5'}`}>
      {/* Main row */}
      <div className="flex items-center gap-1.5">
        {isFromBundle ? (
          <span className="flex items-center justify-center w-6 h-6 text-gray-700 dark:text-gray-300 text-[12px] font-bold shrink-0">-</span>
        ) : (
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-bold shrink-0">{visualIndex || (index + 1)}</span>
        )}
        {/* Thumbnail (not for nested items) */}
        {!isNested && (
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 flex items-center justify-center self-start mt-0.5 aspect-square">
            {item.product.image ? (
              <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-4 w-4 text-gray-300" />
            )}
          </div>
        )}

        {/* Product name + price */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[10px] font-black text-gray-900 dark:text-gray-100 truncate leading-tight">
              {item.product.name}
            </p>
            {isFromBundle && (
              <span className="text-[6px] font-black text-violet-500 bg-violet-500/10 px-1 py-0.5 rounded-full uppercase tracking-wider shrink-0 leading-none">
                deal
              </span>
            )}
          </div>
          {(item.selectedVariant || item.selectedVariantLabel || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 mt-0.5">
              {item.selectedVariantLabel && (
                <span className="text-[7px] font-bold text-gray-500 dark:text-gray-400 leading-tight">{item.selectedVariantLabel}</span>
              )}
              {!item.selectedVariantLabel && item.selectedVariant && (
                <span className="text-[7px] font-bold text-gray-500 dark:text-gray-400 leading-tight">{item.selectedVariant}</span>
              )}
              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                <span className="text-[7px] font-bold text-primary leading-tight">+{item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), currency)})`).join(', ')}</span>
              )}
            </div>
          )}
          {item.addonItems && item.addonItems.length > 0 && (
            <div className="mt-0.5">
              <span className="text-[6px] font-bold text-violet-500 dark:text-violet-400 leading-tight">
                + Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), currency)})`).join(', ')}
              </span>
            </div>
          )}
          {item.toppings && item.toppings.length > 0 && (
            <div className="mt-0.5">
              <span className={`font-medium leading-tight ${isFromBundle ? 'text-[8px] text-gray-400 dark:text-gray-500' : 'text-[10px] text-gray-500 dark:text-gray-400'}`}>
                + {item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), currency)})`).join(', ')}
              </span>
            </div>
          )}
          {item.serialNumber && (
            <div className="mt-0.5">
              <span className="text-[7px] font-black text-amber-600 bg-amber-500/10 px-1 rounded leading-none">SN: {item.serialNumber}</span>
            </div>
          )}
          {!hidePrices && (
            <div className="flex items-center gap-1 mt-0.5">
              {isEditingPrice ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={tempPrice}
                  onChange={(e) => setTempPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  onBlur={handlePriceSubmit}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handlePriceSubmit();
                    if (e.key === 'Escape') setIsEditingPrice(false);
                  }}
                  className="w-14 h-4 text-[8px] font-black bg-white dark:bg-zinc-800 border border-primary rounded px-1 focus:outline-none"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => (profile?.canEditPrice) && (setTempPrice(item.product.price.toString()), setIsEditingPrice(true))}
                  className={`flex items-center gap-1 -ml-1 px-1 py-0.5 rounded-lg transition-all ${(profile?.canEditPrice) ? 'cursor-pointer hover:bg-emerald-50 dark:hover:bg-primary/10 active:scale-95 group/price' : ''}`}
                >
                  <span className={`text-[9px] font-black ${item.product.price < item.product.cost ? 'text-rose-500' : (profile?.canEditPrice) ? 'text-primary dark:text-emerald-400' : 'text-gray-600'}`}>
                    {formatCurrency(item.product.price, currency)}
                  </span>
                  {item.originalPrice !== undefined && Math.round(item.product.price) !== Math.round(item.originalPrice) && (
                    <span className="text-[7px] font-bold text-gray-500 line-through">{formatCurrency(item.originalPrice, currency)}</span>
                  )}
                  {item.product.price < item.product.cost && (
                    <div className="flex items-center gap-0.5 px-1 bg-rose-500/10 rounded">
                      <AlertCircle className="h-2 w-2 text-rose-500" />
                      <span className="text-[6px] font-black text-rose-500">Cost: {formatCurrency(item.product.cost, currency)}</span>
                    </div>
                  )}
                  {(profile?.canEditPrice) && (
                    <Edit2 className="h-2 w-2 text-primary/50 group-hover/price:text-primary transition-colors" />
                  )}
                </div>
              )}
              {showDiscount && Math.abs(item.discount) > 0 && (
                <span className="text-[7px] font-black text-primary bg-primary/10 px-1 py-0.5 rounded leading-none shrink-0">
                  -{(item.bundleId || item.bundle_id) ? Math.abs(item.discount).toLocaleString() : item.discountValue}{(item.bundleId || item.bundle_id) ? getCurrencySymbol(currency) : (item.discountType === 'percentage' ? '%' : getCurrencySymbol(currency))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Qty stepper or static Qty display if nested / from bundle */}
        {(isNested || isFromBundle) ? (
          <span className="text-[9px] font-black px-1.5 py-0.5 bg-violet-500/5 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded shrink-0 self-center select-none">
            {baseQuantity !== undefined ? baseQuantity : Math.abs(item.quantity)}x
          </span>
        ) : (
          <div className="flex items-center self-center bg-gray-150/70 dark:bg-white/5 rounded-full p-0.5 shrink-0">
            <button
              onClick={() => onUpdateQuantity(index, item.quantity - 1)}
              className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-red-500 active:scale-90 transition-all"
            >
              <Minus className="h-2.5 w-2.5" />
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={item.quantity || ''}
              onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9.-]/g, '')); onUpdateQuantity(index, isNaN(v) ? 0 : v); }}
              onKeyDown={(e) => e.stopPropagation()}
              className={`w-6 bg-transparent text-center text-[10px] font-black focus:outline-none no-spinners ${item.quantity < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}
            />
            <button
              onClick={() => onUpdateQuantity(index, item.quantity + 1)}
              className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-primary active:scale-90 transition-all"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {/* Subtotal + actions */}
        <div className="flex flex-col items-end shrink-0 min-w-[50px]">
          {!hidePrices && (
            <span className={`text-[9px] font-black leading-tight ${item.quantity < 0 || item.subtotal < (item.product.cost * item.quantity) ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
              {formatCurrency(item.subtotal, currency)}
            </span>
          )}
          {!(isNested || isFromBundle) && (
            <div className="flex items-center gap-2 mt-1">
              {(profile?.canGiveDiscount) && (
                <button
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className={`w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-[9px] font-black leading-none rounded-full transition-colors ${item.discount > 0 ? 'text-primary bg-emerald-500/10' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary'}`}
                  title="Discount"
                >
                  %
                </button>
              )}
              {(profile?.canGiveDiscount) && item.discount > 0 && (
                <button
                  onClick={clearItemDiscount}
                  className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-primary hover:text-red-500 hover:bg-rose-500/10 rounded-full transition-colors"
                  title="Clear Item Discount"
                >
                  <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                </button>
              )}
              {(profile?.canEditPrice) && (
                <button
                  onClick={() => {
                    setTempPrice(item.product.price.toString());
                    setIsEditingPrice(!isEditingPrice);
                  }}
                  className={`w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center rounded-full transition-colors ${isEditingPrice ? 'text-primary bg-emerald-500/10' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary'}`}
                  title="Edit Price"
                >
                  <Edit2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                </button>
              )}
              <button onClick={() => onRemove(index)} className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-rose-500/10 rounded-full transition-colors" title="Remove">
                <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline discount panel */}
      {showDiscountInput && (
        <div className="mt-1 flex items-center gap-1 bg-gray-50 dark:bg-black/75 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1">
          <div className="flex bg-gray-200 dark:bg-white/5 p-0.5 rounded-md shrink-0">
            {(['percentage', 'fixed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDiscountType(t)}
                className={`px-1.5 py-0.5 text-[6px] font-black rounded-md transition-all ${discountType === t ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-600'}`}
              >
                {t === 'percentage' ? '%' : getCurrencySymbol(currency)}
              </button>
            ))}
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value.replace(/[^0-9.]/g, ''))}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') handleDiscountSubmit();
              if (e.key === 'Escape') setShowDiscountInput(false);
            }}
            className="flex-1 bg-white dark:bg-white/5 rounded-md px-2 py-1 text-[8px] font-bold text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none border-0"
            autoFocus
          />
          <button onClick={handleDiscountSubmit} className="w-5 h-5 flex items-center justify-center bg-primary text-white rounded-md hover:bg-emerald-700 transition-colors">
            <Plus className="h-2.5 w-2.5" />
          </button>
          <button onClick={() => setShowDiscountInput(false)} className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
            <X className="h-2 w-2" />
          </button>
        </div>
      )}
    </div>
  );
}

export { CartItemCard };
