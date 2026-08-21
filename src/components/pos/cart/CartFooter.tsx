import { useCartStore, useAppStore, useSettingsStore } from '../../../stores';
import { useAuth } from '../../../context/AuthContext';
import { getDiscountIneligibilityReason } from '../../../lib/discountUtils';
import { Gift, AlertCircle, X } from 'lucide-react';
import { sonner } from '../../../lib/sonner';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { Modal } from '../../../shared/ui/Modal';
import { HelpTooltip } from '../../../shared/ui/HelpTooltip';
import { CartActions } from './CartActions';

interface CartFooterProps {
  subtotal: number;
  taxAmount: number;
  manualItemDiscountTotal: number;
  activePromotions: { discountName: string; discountAmount: number }[];
  freeGifts: { product: { name: string } }[];
  billDiscountAmount: number;
  isBelowCost: boolean;
  total: number;
  billDiscountInput: string;
  setBillDiscountInput: (v: string) => void;
  showPromoModal: boolean;
  setShowPromoModal: (v: boolean) => void;
  onSaveDraft: () => void;
  onCheckout: () => void;
}

export function CartFooter({
  subtotal,
  taxAmount,
  manualItemDiscountTotal,
  activePromotions,
  freeGifts,
  billDiscountAmount,
  isBelowCost,
  total,
  billDiscountInput,
  setBillDiscountInput,
  showPromoModal,
  setShowPromoModal,
  onSaveDraft,
  onCheckout,
}: CartFooterProps) {
  const appSettings = useSettingsStore(s => s.settings);
  const appCart = useCartStore(s => s.cart);
  const appBillDiscountValue = useCartStore(s => s.billDiscountValue);
  const appActiveSalesTab = useCartStore(s => s.activeSalesTab);
  const appBillDiscountType = useCartStore(s => s.billDiscountType);
  const appSelectedCustomer = useCartStore(s => s.selectedCustomer);
  const appDiscounts = useAppStore(s => s.discounts);
  const { profile } = useAuth();
  const showDiscount = appSettings.receiptShowDiscount !== false &&
    !appCart.some(item => item.bundleHideItemPrices === true || item.bundle_hide_item_prices === true);

  return (
    <div className="shrink-0 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-black/75">

      {/* Subtotal / Tax / Discounts */}
      <div className="pl-4 pr-5 pt-2 pb-1 space-y-1">

        {/* Sub + Tax */}
        {showDiscount && (
          <div className="flex justify-between text-[9px] font-bold text-gray-600">
            <span>{"Subtotal"}</span>
            <span className="text-gray-700 dark:text-gray-300">{formatCurrency(subtotal, appSettings.currency)}</span>
          </div>
        )}
        {Math.abs(taxAmount) > 0 && (
          <div className="flex justify-between text-[9px] font-bold text-gray-600">
            <span>{"Tax"} ({appSettings.taxRate}%)</span>
            <span className="text-gray-700 dark:text-gray-300">{formatCurrency(Math.abs(taxAmount), appSettings.currency)}</span>
          </div>
        )}

        {/* Item discounts */}
        {showDiscount && Math.abs(manualItemDiscountTotal) > 0 && (
          <div className="flex justify-between text-[9px] font-black text-primary dark:text-emerald-400">
            <span>{"Discount"}</span>
            <span>-{formatCurrency(Math.abs(manualItemDiscountTotal), appSettings.currency)}</span>
          </div>
        )}

        {/* Promotions */}
        {showDiscount && activePromotions.map((promo, i) => (
          <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-lg px-2 py-0.5">
            <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-400 uppercase truncate pr-2">{promo.discountName}</span>
            <span className="text-[8px] font-black text-primary shrink-0">-{formatCurrency(promo.discountAmount, appSettings.currency)}</span>
          </div>
        ))}
        {/* Free gifts */}
        {freeGifts.map((gift, i) => (
          <div key={i} className="flex items-center justify-between bg-purple-500/5 border border-purple-500/10 rounded-lg px-2 py-0.5">
            <span className="text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase truncate pr-2">FREE: {gift.product.name}</span>
            <Gift className="h-3 w-3 text-purple-500 shrink-0" />
          </div>
        ))}
      </div>

      {/* Bill Discount Row */}
      <div className="pl-4 pr-5 pb-2">
        <div className="flex items-center gap-1.5 w-full">
          {/* % / $ toggle */}
          <div className="flex items-center bg-gray-150 dark:bg-white/5 p-0.5 rounded-full shrink-0 self-center">
            {(['percentage', 'fixed'] as const).map((type) => (
              <button
                key={type}
                onClick={() =>
                  useCartStore.getState().updateSalesTab({ id: appActiveSalesTab, updates: { billDiscountType: type } },)
                }
                disabled={!profile?.canGiveDiscount}
                className={`flex items-center justify-center min-w-[32px] h-[26px] px-2 text-[10px] font-black rounded-full transition-all ${appBillDiscountType === type
                  ? 'bg-white dark:bg-zinc-800 text-primary dark:text-white shadow-sm'
                  : 'text-gray-500'
                  } disabled:opacity-40`}
              >
                {type === 'percentage' ? '%' : getCurrencySymbol(appSettings.currency)}
              </button>
            ))}
          </div>
          {/* Discount input */}
          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={billDiscountInput}
              dir="ltr"
              inputMode="decimal"
              disabled={!profile?.canGiveDiscount}
              onChange={(e) => {
                const raw = e.target.value;
                if (!/^\d*\.?\d*$/.test(raw)) return;
                setBillDiscountInput(raw);
                const val = parseFloat(raw);
                useCartStore.getState().updateSalesTab({ id: appActiveSalesTab, updates: { billDiscountValue: Number.isFinite(val) ? val : 0 } },);
              }}
              onBlur={() => {
                const val = parseFloat(billDiscountInput);
                const normalized = Number.isFinite(val) && val > 0 ? String(val) : '';
                setBillDiscountInput(normalized);
              }}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={"Bill discount"}
              className={`w-full text-left text-[11px] font-bold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-full h-[32px] py-1 pl-3 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${billDiscountAmount > 0 ? 'pr-16' : 'pr-3'}`}
            />
            <HelpTooltip content="Apply a discount to the entire bill (either percentage or fixed currency amount). Requires authorized discount privileges." />
            {showDiscount && Math.abs(billDiscountAmount) > 0 && (
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[8px] font-black text-primary pointer-events-none">
                -{formatCurrency(Math.abs(billDiscountAmount), appSettings.currency)}
              </span>
            )}
          </div>

          {(profile?.canGiveDiscount) && appBillDiscountValue > 0 && (
            <button
              onClick={() => {
                setBillDiscountInput('');
                useCartStore.getState().updateSalesTab({ id: appActiveSalesTab, updates: { billDiscountValue: 0 } },);
              }}
              className="shrink-0 w-[32px] h-[32px] flex items-center justify-center bg-gray-100 dark:bg-white/5 border border-transparent rounded-full text-gray-500 hover:text-red-500 hover:bg-rose-500/10 transition-colors active:scale-95"
              title="Clear Discount"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Promo picker */}
          {(profile?.canGiveDiscount) && (
            <button
              onClick={() => {
                const promos = appDiscounts.filter((d: any) => d.active);
                if (!promos.length) { sonner.info('No active promotions.'); return; }
                setShowPromoModal(true);
              }}
              className="shrink-0 w-[32px] h-[32px] flex items-center justify-center bg-gray-100 dark:bg-white/5 border border-transparent rounded-full text-gray-500 hover:text-primary hover:bg-emerald-500/10 transition-colors active:scale-95"
              title="Browse Promotions"
            >
              <Gift className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grand Total + Buttons */}
      <div className="flex items-center justify-between pl-4 pr-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2.5 border-t border-gray-200 dark:border-white/10">
        <div>
          <p className="text-[8px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest leading-none">{"Grand Total"}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-lg font-black tracking-tight leading-none ${isBelowCost ? 'text-red-500 animate-pulse' : 'text-amber-500 dark:text-amber-400'}`}>
              {formatCurrency(total, appSettings.currency)}
            </span>
            {isBelowCost && <AlertCircle className="h-3 w-3 text-red-500" />}
          </div>
          {/* §4.2 MASTER: warn when items will go negative (allowNegativeStock=true means allowed but flagged) */}
          {appSettings.allowNegativeStock !== false && appCart.some(item =>
            !item.product.isService && item.product.trackInventory !== false &&
            (item.product.stock - item.quantity) < 0
          ) && (
            <div className="flex items-center gap-1 mt-0.5">
              <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">⚠ Stock will go negative</span>
            </div>
          )}
        </div>

        <CartActions onSaveDraft={onSaveDraft} onCheckout={onCheckout} />
      </div>

      {/* Promotion Selection Modal */}
      <Modal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        title={"SELECT PROMOTION"}
        subtitle={"APPLY ACTIVE OFFERS TO BILL"}
        maxWidth="sm"
      >
        <div className="space-y-3">
          {appDiscounts.filter((d: any) => d.active).map((d: any) => {
            const reason = getDiscountIneligibilityReason(d, appCart, appSelectedCustomer, 'cash', subtotal);
            const isEligible = !reason;
            const isAuto = d.isAutoApply !== false;
            const disabled = !isEligible || isAuto;
            return (
              <button
                key={d.id}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setBillDiscountInput(String(d.value));
                  useCartStore.getState().updateSalesTab({
                      id: appActiveSalesTab,
                      updates: {
                        billDiscountValue: d.value,
                        billDiscountType: d.type === 'percentage' ? 'percentage' : 'fixed'
                      }
                    });
                  setShowPromoModal(false);
                  sonner.success(`"${d.name}" applied!`);
                }}
                className={`w-full text-left p-5 bg-gray-50 dark:bg-white/5 border rounded-2xl transition-all relative overflow-hidden ${disabled
                  ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-white/5'
                  : 'border-gray-200 dark:border-white/5 hover:bg-emerald-50 dark:hover:bg-primary/10 active:scale-[0.98] group'
                  }`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 transition-colors" />

                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="space-y-0.5">
                    <p className={`font-black text-[12px] uppercase tracking-tight transition-colors ${disabled ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white group-hover:text-primary'}`}>{d.name}</p>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Promotion ID: {d.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <span className="flex items-center gap-1.5">
                    {isAuto && isEligible && (
                      <span className="text-[8px] font-black text-white bg-blue-500 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                        Auto
                      </span>
                    )}
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 shadow-sm">
                      {d.type === 'percentage' ? d.value + '%' : formatCurrency(d.value, appSettings.currency)} OFF
                    </span>
                  </span>
                </div>

                {!isEligible ? (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/5 relative z-10">
                    <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
                    <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest">{reason}</p>
                  </div>
                ) : d.minAmount ? (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/5 relative z-10">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                      Unlock at {formatCurrency(d.minAmount, appSettings.currency)}+
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/5 relative z-10">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    <p className="text-[9px] text-primary/60 font-black uppercase tracking-widest">
                      {isAuto ? 'Auto-applied to bill' : 'Available for all orders'}
                    </p>
                  </div>
                )}
              </button>
            );
          })}

          {appDiscounts.filter((d: any) => d.active).length === 0 && (
            <div className="py-12 text-center">
              <Gift className="w-12 h-12 text-gray-200 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">No Active Promotions</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
