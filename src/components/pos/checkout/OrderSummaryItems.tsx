import { ShoppingBag, Gift } from 'lucide-react';
import type { CSSProperties } from 'react';
import { CartItem } from '../../../types';
import { CompactItemRow } from '../CompactItemRow';
import { formatCurrency } from '../../../lib/currencies';
import { cn } from '../../../lib/utils';

interface OrderSummaryItemsProps {
  checkoutCartItems: CartItem[];
  appBundles: any;
  showDiscount: boolean;
  currency: string;
}

export function OrderSummaryItems({ checkoutCartItems, appBundles, showDiscount, currency }: OrderSummaryItemsProps) {
  return (
    <div className="space-y-1.5 overflow-y-auto custom-scrollbar max-h-[30vh] md:max-h-[40vh] pr-1" style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}>
      {(() => {
        const groupCartItems = (cartItems: CartItem[]) => {
          const bundlesMap = new Map<string, {
            bundleId: string;
            bundleName: string;
            bundleImage?: string;
            items: { item: CartItem; originalIndex: number }[];
            totalOriginal: number;
            totalDiscount: number;
            totalSubtotal: number;
          }>();
          const standaloneItems: { item: CartItem; originalIndex: number }[] = [];

          cartItems.forEach((item, index) => {
            const bundleId = item.bundleId || item.bundle_id;
            const bundleName = item.bundleName || item.bundle_name;

            if (bundleId) {
              if (!bundlesMap.has(bundleId)) {
                bundlesMap.set(bundleId, {
                  bundleId,
                  bundleName: bundleName || 'Deal',
                  items: [],
                  totalOriginal: 0,
                  totalDiscount: 0,
                  totalSubtotal: 0
                });
              }
              const b = bundlesMap.get(bundleId)!;
              b.items.push({ item, originalIndex: index });
              b.totalOriginal += item.product.price * item.quantity;
              b.totalDiscount += item.discount || 0;
              b.totalSubtotal += item.subtotal || 0;
            } else {
              standaloneItems.push({ item, originalIndex: index });
            }
          });

          bundlesMap.forEach((b) => {
            const bundleDef = appBundles?.find((x: any) => x.id === b.bundleId);
            if (bundleDef?.image) b.bundleImage = bundleDef.image;
          });

          return {
            bundles: Array.from(bundlesMap.values()),
            standaloneItems
          };
        };

        const { bundles, standaloneItems } = groupCartItems(checkoutCartItems);

        const renderItemCard = (itemData: { item: CartItem; originalIndex: number }, isNested = false, sIdx?: number) => {
          const { item, originalIndex } = itemData;
          const hidePrices = isNested && item.bundleHideItemPrices === true;
          return (
            <div key={originalIndex} className={cn(
              "flex items-start gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5",
              isNested && "shadow-none border-none bg-transparent dark:bg-transparent p-1"
            )}>
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-bold shrink-0 mt-0.5">{isNested ? '-' : (sIdx !== undefined ? sIdx + 1 : originalIndex + 1)}</span>
              <div className="h-9 w-9 rounded-lg bg-white dark:bg-surface border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5 aspect-square">
                {item.product.image ? (
                  <img src={item.product.image} className="h-full w-full object-cover" />
                ) : (
                  <ShoppingBag className="w-4 h-4 text-gray-600 dark:text-white/20" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase text-gray-900 dark:text-white truncate leading-none">{item.product.name}</p>
                {(item.selectedVariant || item.selectedVariantLabel || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                  <div className="flex flex-col gap-0.5 my-1">
                    {item.selectedVariantLabel && (
                      <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400 leading-tight truncate">
                        {item.selectedVariantLabel}
                      </span>
                    )}
                    {!item.selectedVariantLabel && item.selectedVariant && (
                      <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400 leading-tight truncate">
                        {item.selectedVariant}
                      </span>
                    )}
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <span className="text-[8px] font-bold text-primary dark:text-primary leading-tight truncate">
                        + {item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), currency)})`).join(', ')}
                      </span>
                    )}
                  </div>
                )}
                {item.addonItems && item.addonItems.length > 0 && (
                  <div className="my-1">
                    <span className="text-[7px] font-bold text-violet-500 dark:text-violet-400 leading-tight truncate block">
                      + Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), currency)})`).join(', ')}
                    </span>
                  </div>
                )}
                {item.toppings && item.toppings.length > 0 && (
                  <div className="my-1">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight">
                      + {item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), currency)})`).join(', ')}
                    </span>
                  </div>
                )}
                {item.displayToppings && item.displayToppings.length > 0 && (
                  <div className="my-1">
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 leading-tight">
                      + {item.displayToppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}
                    </span>
                  </div>
                )}
                {item.serialNumber && (
                  <div className="my-1">
                    <span className="text-[8px] font-black text-amber-600 dark:text-amber-500 bg-amber-500/10 px-1 py-[1px] rounded max-w-fit leading-none tracking-widest uppercase">
                      SN: {item.serialNumber}
                    </span>
                  </div>
                )}
                {!hidePrices && (
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[8px] text-gray-600 font-bold">
                      {Math.abs(item.quantity)} × {formatCurrency(item.product.price, currency)}
                    </p>
                    {isNested && (
                      <p className="text-[11px] font-black text-gray-900 dark:text-white tabular-nums shrink-0 self-start">
                        {formatCurrency(item.product.price * item.quantity, currency)}
                      </p>
                    )}
                  </div>
                )}
                {showDiscount && !isNested && item.discount > 0 && (
                  <div className="flex items-center justify-between text-[8px] text-rose-500 font-black mt-1.5 uppercase tracking-widest bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-100 dark:border-rose-500/20">
                    <span className="flex items-center gap-1">
                      <Gift className="w-2.5 h-2.5" />
                      {"Discount"} {item.discountType === 'percentage' && item.discountValue ? `(${item.discountValue}%)` : ''}
                    </span>
                    <span className="tabular-nums">-{formatCurrency(item.discount, currency)}</span>
                  </div>
                )}
              </div>
              {!isNested && (
                <p className="text-[11px] font-black text-gray-900 dark:text-white tabular-nums shrink-0 self-start mt-0.5">
                  {formatCurrency(item.product.price * item.quantity, currency)}
                </p>
              )}
            </div>
          );
        };

        const renderedBundlesHeader = bundles.length > 0 ? (
          <div className="flex items-center gap-1.5 px-1 text-[8px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1">
            <Gift className="h-3 w-3 text-violet-500 shrink-0" />
            <span>{"Bundle / Deal Items"} ({bundles.length})</span>
          </div>
        ) : null;

        const renderedStandalonesHeader = bundles.length > 0 && standaloneItems.length > 0 ? (
          <div className="flex items-center gap-1.5 px-1 pt-2 text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-t border-gray-100 dark:border-white/5 mt-2 mb-1">
            <ShoppingBag className="h-3 w-3 text-gray-400 shrink-0" />
            <span>{"Other / Standalone Items"} ({standaloneItems.length})</span>
          </div>
        ) : null;

        const bundleThumb = (b: typeof bundles[number]) => b.bundleImage || b.items[0]?.item.product?.image || null;

        const renderedBundles = bundles.map((b, bIdx) => {
          const discountStr = showDiscount && b.totalDiscount > 0 ? `-${formatCurrency(b.totalDiscount, currency)}` : undefined;
          return (
            <div key={`checkout-page-bundle-${b.bundleId}`} className="p-3 my-1.5 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/[0.01]">
              <CompactItemRow
                image={bundleThumb(b)}
                name={`${bIdx + 1}. ${b.bundleQty > 1 ? `${b.bundleQty}x ${b.bundleName}` : b.bundleName}`}
                price={formatCurrency(b.totalSubtotal, currency)}
                discount={discountStr}
              />
              {b.items[0]?.item.toppings && b.items[0].item.toppings.length > 0 && (
                <div className="pl-[3.25rem] pr-3 mt-0.5 mb-1">
                  <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-tight">
                    + {b.items[0].item.toppings.map((t: any) => `${t.name} (${formatCurrency(t.price, currency)})`).join(', ')}
                  </span>
                </div>
              )}
              <div className="mt-2 pl-8 border-t border-dashed border-violet-500/10 pt-1.5 space-y-1">
                {b.items.map(({ item, originalIndex }) => (
                  <div key={originalIndex} className="flex flex-col text-[9px] text-gray-600 dark:text-gray-400 font-bold uppercase">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 truncate">- {b.bundleQty > 0 ? Math.round(Math.abs(item.quantity) / b.bundleQty) : Math.abs(item.quantity)} × {item.product.name}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {item.selectedVariantLabel && <span className="text-[8px] text-gray-500">({item.selectedVariantLabel})</span>}
                        {!item.selectedVariantLabel && item.selectedVariant && <span className="text-[8px] text-gray-500">({item.selectedVariant})</span>}
                      </div>
                    </div>
                    {item.addonItems && item.addonItems.length > 0 && (
                      <div className="text-[9px] font-medium text-violet-500 dark:text-violet-400 leading-tight mt-0.5">
                        + Add-ons: {item.addonItems.map(a => `${a.addon?.name || a.name} ${a.quantity}x (${formatCurrency(a.subtotal, currency)})`).join(', ')}
                      </div>
                    )}
                    {item.displayToppings && item.displayToppings.length > 0 && (
                      <div className="text-[9px] font-medium text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
                        + {item.displayToppings.map(t => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        });

        const renderedStandalones = standaloneItems.map((item, sIdx) => renderItemCard(item, false, sIdx));

        return (
          <>
            {renderedBundlesHeader}
            {renderedBundles}
            {renderedStandalonesHeader}
            {renderedStandalones}
          </>
        );
      })()}
    </div>
  );
}
