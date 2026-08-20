import { Dispatch, SetStateAction } from 'react';
import { CartAddonItem, ProductAddon } from '../../types';

export function useAddonQuantity(appProducts: any[], setAddonItems: Dispatch<SetStateAction<CartAddonItem[]>>) {
  return (addon: ProductAddon, delta: number) => {
    setAddonItems(current => {
      const existing = current.find(item => item.addon.id === addon.id);
      const currentQty = existing ? existing.quantity : 0;
      const newQty = Math.max(0, Math.min(currentQty + delta, addon.maxQty || 1));

      const addonProduct = appProducts.find(p => p.id === addon.addonProductId);
      const stockLimit = addonProduct && addonProduct.trackInventory ? (addonProduct.stock || 0) : 999999;
      if (newQty > stockLimit) return current;

      if (newQty === 0) {
        return current.filter(item => item.addon.id !== addon.id);
      }

      if (existing) {
        return current.map(item =>
          item.addon.id === addon.id
            ? { ...item, quantity: newQty, subtotal: newQty * addon.price }
            : item
        );
      }

      return [...current, { addon, quantity: newQty, subtotal: newQty * addon.price }];
    });
  };
}
