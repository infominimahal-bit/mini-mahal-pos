import { ShoppingBag, Gift, Wallet } from 'lucide-react';
import { CartItem } from '../../../types';
import { formatCurrency } from '../../../lib/currencies';
import { useTranslation } from '../../../hooks/useTranslation';
import { OrderSummaryItems } from './OrderSummaryItems';

interface OrderSummaryProps {
  checkoutCartItems: CartItem[];
  appBundles: any;
  showDiscount: boolean;
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  finalTotal: number;
  totalQty: number;
  currency: string;
  saleTypes: { id: string; label: string; icon: any; enabled: boolean }[];
  saleType: 'retail' | 'wholesale';
  setSaleType: (v: any) => void;
}

export function OrderSummary({
  checkoutCartItems,
  appBundles,
  showDiscount,
  subtotal,
  totalDiscount,
  taxAmount,
  finalTotal,
  totalQty,
  currency,
  saleTypes,
  saleType,
  setSaleType,
}: OrderSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 flex flex-col order-2 md:order-1 border-t md:border-t-0 border-gray-200 dark:border-white/5 bg-white dark:bg-[#0C0C0C]">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <ShoppingBag className="w-3.5 h-3.5 text-primary" />
        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{"Order Items"}</span>
      </div>

      <OrderSummaryItems
        checkoutCartItems={checkoutCartItems}
        appBundles={appBundles}
        showDiscount={showDiscount}
        currency={currency}
      />

      {/* Totals */}
      <div className="pt-3 border-t border-gray-200 dark:border-white/5 space-y-1.5 px-1">
        <div className="flex justify-between">
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{"Subtotal"}</span>
          <span className="text-[11px] font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(subtotal - totalDiscount, currency)}</span>
        </div>
        {showDiscount && totalDiscount > 0 && (
          <div className="flex justify-between">
            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1"><Gift className="w-3 h-3" />{"Discount"}</span>
            <span className="text-[11px] font-black text-rose-500 tabular-nums">-{formatCurrency(totalDiscount, currency)}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{"Tax"}</span>
            <span className="text-[11px] font-black text-gray-900 dark:text-white tabular-nums">+{formatCurrency(taxAmount, currency)}</span>
          </div>
        )}
      </div>

      {/* Net Payable — desktop only */}
      <div className="hidden md:block mt-4 space-y-2">
        <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20 relative overflow-hidden group transition-all hover:scale-[1.01]">
          <div className="absolute right-3 top-3 opacity-20 group-hover:opacity-40 transition-opacity"><Wallet className="w-14 h-14 text-white rotate-12" /></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.25em]">{"Net Payable"}</p>
              <h3 className="text-lg sm:text-xl lg:text-3xl font-black text-white tracking-[-0.05em] leading-none block break-all mt-1">{formatCurrency(finalTotal, currency)}</h3>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/20 border border-white/10">
              <p className="text-[9px] font-black text-white uppercase tracking-widest">{totalQty} {"QTY"}</p>
            </div>
          </div>
        </div>

        {/* Sale Type Selector (Desktop) */}
        {saleTypes.length > 0 && (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(saleTypes.length, 3)}, minmax(0, 1fr))` }}>
            {saleTypes.map(st => {
              const Icon = st.icon;
              return (
                <button key={st.id} onClick={() => setSaleType(st.id as any)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wide transition-all active:scale-95 touch-manipulation ${saleType === st.id ? 'bg-primary text-white border-primary shadow-sm shadow-emerald-500/20' : 'bg-gray-50 dark:bg-white/[0.03] text-gray-600 border-gray-200 dark:border-white/5 hover:text-gray-600 dark:hover:text-gray-200'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t(st.id, st.label)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
