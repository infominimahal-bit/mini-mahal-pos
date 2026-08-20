import { Check } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';

interface ProductOptionsFooterProps {
  totalPrice: number;
  appSettings: any;
  isFormValid: boolean;
  isVariantOutOfStock: boolean;
  matchingVariant: any;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProductOptionsFooter({ totalPrice, appSettings, isFormValid, isVariantOutOfStock, matchingVariant, onClose, onConfirm }: ProductOptionsFooterProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="text-left">
        <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">{"Total Price"}</p>
        <p className="text-base sm:text-lg font-black text-primary dark:text-emerald-400 leading-tight">
          {formatCurrency(totalPrice, appSettings.currency)}
        </p>
        {isVariantOutOfStock && (
          <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Out of Stock</p>
        )}
        {matchingVariant?.trackInventory && matchingVariant.stock !== undefined && !isVariantOutOfStock && (
          <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Stock: {matchingVariant.stock}</p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 sm:gap-3">
        <button
          onClick={onClose}
          className="px-4 sm:px-6 py-2.5 sm:py-3 border border-rose-200 dark:border-rose-900/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shrink-0"
        >
          {"Cancel"}
        </button>
        <button
          onClick={onConfirm}
          disabled={!isFormValid}
          className="btn btn-md btn-primary !py-2.5 sm:!py-3 !text-[9px] sm:!text-[11px]"
        >
          <Check className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">{"Add to Cart"}</span><span className="sm:hidden">{"Add"}</span>
        </button>
      </div>
    </div>
  );
}
