import React from 'react';
import { Gift, Package, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { sonner } from '../../lib/sonner';

interface Props {
  items: any[];
  appBundles: any[];
  appProducts: any[];
  appSettings: any;
  showDiscount: boolean;
  isAdmin: boolean;
  profile: any;
  transactionId: string;
  onNavigateToProduct: (productId: string, fromSale: string) => void;
}

export function TransactionItemsTable({
  items, appBundles, appProducts, appSettings, showDiscount,
  isAdmin: _isAdmin, profile: _profile, transactionId, onNavigateToProduct
}: Props) {
  const groupItems = (items: any[]) => {
    const bundlesMap = new Map<string, any>();
    const standaloneItems: any[] = [];

    items.forEach(item => {
      const bundleId = item.bundleId || item.bundle_id;
      const bundleName = item.bundleName || item.bundle_name;

      if (bundleId) {
        if (!bundlesMap.has(bundleId)) {
          bundlesMap.set(bundleId, {
            bundleId,
            bundleName,
            items: [],
            totalOriginal: 0,
            totalDiscount: 0,
            totalSubtotal: 0
          });
        }
        const b = bundlesMap.get(bundleId)!;
        b.items.push(item);
        const itemPrice = item.product?.price || ((item.subtotal + item.discount) / (item.quantity || 1));
        const original = itemPrice * item.quantity;
        b.totalOriginal += original;
        b.totalDiscount += (item.discount || 0);
        b.totalSubtotal += (item.subtotal || 0);
      } else {
        standaloneItems.push(item);
      }
    });

    const bundles = Array.from(bundlesMap.values()).map(b => {
      let bundleQty = 1;
      const firstCartItem = b.items[0];
      if (firstCartItem) {
        const bundleIdFull = firstCartItem.bundleId || firstCartItem.bundle_id;
        const originalBundleDefId = bundleIdFull?.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0] || bundleIdFull;
        const bundleDef = appBundles?.find(bd => bd.id === originalBundleDefId);
        
        if (bundleDef && bundleDef.items && bundleDef.items.length > 0) {
          const firstBi = bundleDef.items[0];
          const cItem = b.items.find((x: any) => x.product.id === firstBi.productId);
          if (cItem) {
            bundleQty = Math.round(cItem.quantity / firstBi.quantity);
          }
        } else if (firstCartItem.quantity > 0) {
          bundleQty = firstCartItem.quantity;
        }
      }
      
      if (bundleQty === 0) bundleQty = 1;
      
      return {
        ...b,
        bundleQty
      };
    });

    return { bundles, standaloneItems };
  };

  const { bundles, standaloneItems } = groupItems(items);
  const rows: React.ReactNode[] = [];

  if (bundles.length > 0) {
    rows.push(
      <tr key="section-bundles" className="bg-violet-500/[0.03]">
        <td colSpan={3} className="px-2.5 sm:px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Gift className="h-3 w-3 text-violet-500 shrink-0" />
            <span className="text-[8px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">
              {"Bundle / Deal Items"} ({bundles.length})
            </span>
          </div>
        </td>
      </tr>
    );
  }

  bundles.forEach((b, bIdx) => {
    const hideItemPrices = b.items.some((item: any) => item.bundleHideItemPrices === true || item.bundle_hide_item_prices === true);
    const bundleImage = b.items[0]?.product?.image || null;
    const discountStr = showDiscount && b.totalDiscount > 0 ? `-${formatCurrency(b.totalDiscount, appSettings.currency)}` : undefined;
    const bundleQty = b.bundleQty;

    rows.push(
      <tr key={`bundle-${b.bundleId}`} className="bg-violet-500/[0.02] border-t border-gray-100 dark:border-white/5">
        <td className="px-2.5 sm:px-4 py-2">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md overflow-hidden bg-violet-100 dark:bg-violet-900/20 shrink-0 flex items-center justify-center">
              {bundleImage ? (
                <img src={bundleImage} alt={b.bundleName} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-3 w-3 text-violet-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black text-violet-700 dark:text-violet-300 uppercase truncate">{bIdx + 1}. {bundleQty > 1 ? `${bundleQty}x ${b.bundleName}` : b.bundleName}</span>
              {b.items[0]?.toppings && b.items[0].toppings.length > 0 && (
                <span className="text-[8px] font-medium text-gray-500 dark:text-gray-400 leading-tight mt-0.5 truncate">
                  + {b.items[0].toppings.map((t: any) => `${bundleQty > 1 ? bundleQty + 'x ' : ''}${t.name} (${formatCurrency(t.price * bundleQty, appSettings.currency)})`).join(', ')}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-2.5 sm:px-4 py-2 text-right text-[9px] font-bold text-gray-500">{bundleQty}</td>
        <td className="px-2.5 sm:px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <span className="text-[10px] font-black text-primary">{formatCurrency(b.totalSubtotal, appSettings.currency)}</span>
            {discountStr && <span className="text-[7px] font-black text-rose-500">{discountStr}</span>}
          </div>
        </td>
      </tr>
    );

    b.items.forEach((item: any, itemIdx: number) => {
      rows.push(
        <tr
          key={`bundle-${b.bundleId}-item-${itemIdx}`}
          onClick={() => {
            if (item.product?.id) {
              const exists = appProducts.some(p => p.id === item.product?.id);
              if (exists) {
                onNavigateToProduct(item.product.id, transactionId);
              } else {
                sonner.error("Product Deleted", "This product no longer exists in your inventory.");
              }
            }
          }}
          className={`${item.product?.id ? 'cursor-pointer hover:bg-violet-500/[0.03] dark:hover:bg-violet-500/[0.03] transition-colors group' : ''} bg-violet-500/[0.005] border-t border-gray-100/50 dark:border-white/5`}
        >
          <td className={`pl-10 pr-4 py-1.5 text-[9px] text-gray-600 dark:text-gray-400 uppercase ${item.product?.id ? 'group-hover:text-primary' : ''}`}>
            <span className="font-bold">- {bundleQty > 0 ? Math.round(item.quantity / bundleQty) : item.quantity}x {item.product?.name || 'Item'}</span>
            {item.selectedVariant && <span className="text-[8px] text-gray-400"> ({item.selectedVariant})</span>}
            {item.selectedModifiers && item.selectedModifiers.length > 0 && <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 ml-1">+ {item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
            {item.addonItems && item.addonItems.length > 0 && <span className="text-[10px] font-medium text-violet-500 dark:text-violet-400 ml-1">+ Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
            {item.displayToppings && item.displayToppings.length > 0 && <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 ml-1">+ {item.displayToppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}</span>}
            {item.refundedQuantity > 0 && (
              <div className="text-[7px] font-black text-rose-500 uppercase tracking-tight mt-0.5 leading-none">
                {item.refundedQuantity} {"Returned"}
              </div>
            )}
          </td>
          <td className="px-2.5 sm:px-4 py-1.5 text-right text-[9px] font-bold text-gray-500">
          </td>
          <td className="px-2.5 sm:px-4 py-1.5 text-right text-[9px] text-gray-400">
            {!hideItemPrices && formatCurrency(item.product?.price * item.quantity, appSettings.currency)}
          </td>
        </tr>
      );
    });
  });

  if (bundles.length > 0 && standaloneItems.length > 0) {
    rows.push(
      <tr key="section-standalone" className="bg-gray-50/50 dark:bg-white/[0.02]">
        <td colSpan={3} className="px-2.5 sm:px-4 py-2 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {"Other / Standalone Items"} ({standaloneItems.length})
            </span>
          </div>
        </td>
      </tr>
    );
  }

  standaloneItems.forEach((item, index) => {
    rows.push(
      <tr
        key={`standalone-${index}`}
        onClick={() => {
          if (item.product?.id) {
            const exists = appProducts.some(p => p.id === item.product?.id);
            if (exists) {
              onNavigateToProduct(item.product.id, transactionId);
            } else {
              sonner.error("Product Deleted", "This product no longer exists in your inventory.");
            }
          }
        }}
        className={item.product?.id ? "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group" : ""}
      >
        <td className={`px-2.5 sm:px-4 py-3 sm:py-4 text-[11px] font-black text-gray-900 dark:text-white uppercase transition-colors ${item.product?.id ? 'group-hover:text-primary' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 flex items-center justify-center">
              {item.product?.image ? (
                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-3 w-3 text-gray-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="truncate block">{index + 1}. {item.product?.name || "Item"}</span>
              {(item.selectedVariant || (item.selectedModifiers && item.selectedModifiers.length > 0) || item.serialNumber || (item.toppings && item.toppings.length > 0) || (item.displayToppings && item.displayToppings.length > 0)) && (
                <div className="flex flex-col gap-0.5 mt-0.5 normal-case tracking-normal">
                  {item.selectedVariant && <span className="text-[8px] font-bold text-gray-500">{item.selectedVariant}</span>}
                  {item.selectedModifiers && item.selectedModifiers.length > 0 && <span className="text-[8px] font-bold text-primary">+ {item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
                  {item.addonItems && item.addonItems.length > 0 && <span className="text-[8px] font-bold text-violet-500">+ Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
                  {item.toppings && item.toppings.length > 0 && <span className="text-[10px] font-medium text-gray-500">+ {item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
                  {item.displayToppings && item.displayToppings.length > 0 && <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">+ {item.displayToppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}</span>}
                  {item.serialNumber && <span className="text-[8px] font-bold text-amber-500">SN: {item.serialNumber}</span>}
                </div>
              )}
              {showDiscount && item.discount > 0 && (
                <div className="flex items-center gap-1 text-[7px] text-rose-500 font-black mt-1 uppercase tracking-widest bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-100 dark:border-rose-500/20">
                  <Gift className="w-2 h-2" />
                  <span>Discount</span>
                  {item.discountType === 'percentage' && item.discountValue ? `(${item.discountValue}%)` : ''}
                  <span>-{formatCurrency(item.discount, appSettings.currency)}</span>
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-2.5 sm:px-4 py-3 sm:py-4 text-right text-[11px] font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
          <div>{item.quantity}</div>
          {item.refundedQuantity > 0 && (
            <div className="text-[8px] font-black text-rose-500 uppercase tracking-tight mt-0.5 leading-none">
              {item.refundedQuantity} {"Returned"}
            </div>
          )}
        </td>
        <td className="px-2.5 sm:px-4 py-3 sm:py-4 text-right text-[11px] font-black text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(item.subtotal, appSettings.currency)}</td>
      </tr>
    );
  });

  return (
    <div className="border border-gray-200 dark:border-white/5 rounded-[2rem] overflow-x-auto custom-scrollbar">
      <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
        <thead className="bg-gray-50 dark:bg-white/[0.02]">
          <tr>
            <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[10px] font-black text-gray-600 uppercase text-left whitespace-nowrap">{"Item"}</th>
            <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[10px] font-black text-gray-600 uppercase text-right whitespace-nowrap">{"Qty"}</th>
            <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[10px] font-black text-gray-600 uppercase text-right whitespace-nowrap">{"Total"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {rows}
        </tbody>
      </table>
    </div>
  );
}
