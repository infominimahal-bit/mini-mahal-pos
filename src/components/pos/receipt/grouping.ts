import { getDealCountBreakdown } from '../../../lib/utils';

export function computeGrouped(sale: any, appBundles: any[]) {
  const groupItems = (items: any[]) => {
    const bundlesMap = new Map<string, any>();
    const standaloneItems: any[] = [];
    items.forEach((item: any) => {
      const bundleId = item.bundleId || item.bundle_id;
      const bundleName = item.bundleName || item.bundle_name;
      if (bundleId) {
        if (!bundlesMap.has(bundleName)) {
          bundlesMap.set(bundleName, { bundleName, bundleIds: new Set(), itemsMap: new Map(), totalOriginal: 0, totalDiscount: 0, totalSubtotal: 0 });
        }
        const b = bundlesMap.get(bundleName)!;
        b.bundleIds.add(bundleId);

        const childKey = `${item.product?.name || 'Item'}_${item.selectedVariant || ''}_${item.selectedVariantLabel || ''}`;
        if (!b.itemsMap.has(childKey)) {
          b.itemsMap.set(childKey, { ...item, quantity: 0, aggregatedExtras: new Map() });
        }
        const c = b.itemsMap.get(childKey);
        c.quantity += Math.abs(item.quantity);

        const aggregateExtra = (arr: any[], type: string, priceProp: string) => {
          (arr || []).forEach((x: any) => {
            const name = x.name || x.addon?.name;
            const price = x[priceProp] || 0;
            const key = `${type}_${name}_${price}`;
            if (!c.aggregatedExtras.has(key)) c.aggregatedExtras.set(key, { name, price, qty: 0 });
            const addQty = type === 'addon' ? (x.quantity || 1) * Math.abs(item.quantity) : Math.abs(item.quantity);
            c.aggregatedExtras.get(key).qty += addQty;
          });
        };

        aggregateExtra(item.selectedModifiers, 'mod', 'price');
        aggregateExtra(item.addonItems, 'addon', 'subtotal');
        aggregateExtra(item.toppings, 'top', 'price');
        aggregateExtra(item.displayToppings, 'dtop', 'price');

        const itemPrice = item.product?.price || ((item.subtotal + item.discount) / (item.quantity || 1));
        b.totalOriginal += itemPrice * item.quantity;
        b.totalDiscount += (item.discount || 0);
        b.totalSubtotal += (item.subtotal || 0);
      } else {
        standaloneItems.push(item);
      }
    });

    const bundles = Array.from(bundlesMap.values()).map(b => {
      let bundleQty = b.bundleIds.size;
      const firstCartItem = Array.from(b.itemsMap.values())[0] as any;
      if (firstCartItem) {
        const bundleIdFull = firstCartItem.bundleId || firstCartItem.bundle_id;
        const originalBundleDefId = bundleIdFull?.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0] || bundleIdFull;
        const bundleDef = appBundles?.find(bd => bd.id === originalBundleDefId);

        if (bundleDef && bundleDef.items && bundleDef.items.length > 0) {
          const firstBi = bundleDef.items[0];
          const cItem = Array.from(b.itemsMap.values()).find((x: any) => x.product.id === firstBi.productId) as any;
          if (cItem) {
            bundleQty = Math.round(cItem.quantity / firstBi.quantity);
          }
        } else if (firstCartItem.quantity > 0) {
          bundleQty = firstCartItem.quantity;
        }
      }

      if (bundleQty === 0) bundleQty = 1;

      return {
        bundleId: Array.from(b.bundleIds)[0],
        bundleName: b.bundleName,
        bundleQty: bundleQty,
        items: Array.from(b.itemsMap.values()).map((c: any) => ({
          ...c,
          extrasList: Array.from(c.aggregatedExtras.values())
        })),
        totalOriginal: b.totalOriginal,
        totalDiscount: b.totalDiscount,
        totalSubtotal: b.totalSubtotal
      };
    });

    return { bundles, standaloneItems };
  };

  const grouped = groupItems(sale.items);
  const shBundles = grouped.bundles;
  const shStandalone = grouped.standaloneItems;
  const bd = getDealCountBreakdown(sale.items, appBundles);
  const shDealDiscount = (sale.items || []).reduce((sum: number, item: any) => sum + ((item.bundleId || item.bundle_id) ? (item.discount || 0) : 0), 0);
  const shItemDiscount = (sale.items || []).reduce((sum: number, item: any) => sum + ((item.bundleId || item.bundle_id) ? 0 : (item.discount || 0)), 0);
  const shBillDiscount = Math.max(0, (sale.discountAmount || 0) - shDealDiscount - shItemDiscount);

  return { shBundles, shStandalone, bd, shDealDiscount, shItemDiscount, shBillDiscount };
}
