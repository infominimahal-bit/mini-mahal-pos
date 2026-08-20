import { useCallback } from 'react';
import { useCartStore } from '../../../stores';
import { bundlesService } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import { CartItemTopping } from '../../../types';

interface BundleHandlerDeps {
  appCart: any[];
  appProducts: any[];
  isReturnMode: boolean;
  currency: string;
  setActiveCombo: (v: any) => void;
  setActiveGroup: (v: any) => void;
}

export function useBundleGridHandlers({ appCart, appProducts, isReturnMode, currency, setActiveCombo, setActiveGroup }: BundleHandlerDeps) {
  const handleBundleQuantity = useCallback((item: any, d: number) => {
    if (item.isGroup) {
      if (d > 0) handleAddBundle(item);
      return;
    }

    const bundleItemsInCart = appCart.filter((x: any) => {
      const bId = x.bundleId || x.bundle_id;
      return bId && bId.startsWith(item.id + '-');
    });
    if (bundleItemsInCart.length === 0) {
      if (d > 0) handleAddBundle(item);
      return;
    }

    let currentQty = 0;
    if (item.items && item.items.length > 0) {
      const firstBi = item.items[0];
      const cartItem = bundleItemsInCart.find(x => x.product.id === firstBi.productId);
      if (cartItem) {
        currentQty = Math.round(cartItem.quantity / firstBi.quantity);
      }
    } else {
      currentQty = bundleItemsInCart[0].quantity;
    }

    const newBundleQty = currentQty + d;

    if (newBundleQty <= 0) {
      const updatedCart = appCart.filter((x: any) => {
        const bId = x.bundleId || x.bundle_id;
        return !(bId && bId.startsWith(item.id + '-'));
      });
      useCartStore.getState().setCart(updatedCart);
      return;
    }

    if (currentQty === 0) currentQty = 1;

    const newCart = appCart.map(cartItem => {
      const bId = cartItem.bundleId || cartItem.bundle_id;
      if (bId && bId.startsWith(item.id + '-')) {
        const itemBaseQty = cartItem.quantity / currentQty;
        const qty = isReturnMode ? -Math.abs(itemBaseQty * newBundleQty) : itemBaseQty * newBundleQty;

        const itemBaseDiscount = (cartItem.discount || 0) / currentQty;
        const discount = isReturnMode ? -Math.abs(itemBaseDiscount * newBundleQty) : itemBaseDiscount * newBundleQty;

        const toppingsTotal = (cartItem.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
        return {
          ...cartItem,
          quantity: qty,
          discount: discount,
          subtotal: ((cartItem.price ?? cartItem.product.price) + toppingsTotal) * qty - discount
        };
      }
      return cartItem;
    });

    useCartStore.getState().setCart(newCart);
  }, [appCart, appProducts, isReturnMode,]);

  const processBundleAdd = (bundle: any, selectedItems?: { productId: string; quantity: number }[], toppingsMap?: Record<string, CartItemTopping[]>) => {
    try {
      if (!bundle) {
        sonner.error('Bundle data is missing');
        return;
      }

      const effectiveBundle = selectedItems ? { ...bundle, items: selectedItems } : bundle;
      let variantToSet: string | undefined;
      const lowerName = bundle.name.toLowerCase();
      if (lowerName.includes(' - small')) {
        variantToSet = '6 Inch';
      } else if (lowerName.includes(' - medium')) {
        variantToSet = '10 Inch';
      } else if (lowerName.includes(' - large')) {
        variantToSet = '13 Inch';
      }

      const signaturePayload = {
        baseId: bundle.id,
        items: selectedItems?.map(i => `${i.productId}:${i.quantity}`).sort().join(',') || '',
        toppings: toppingsMap ? Object.entries(toppingsMap).map(([pid, tArr]) => `${pid}:${tArr.map(t => t.id).sort().join(',')}`).sort().join('|') : ''
      };
      const signatureString = JSON.stringify(signaturePayload);
      let hash = 0;
      for (let i = 0; i < signatureString.length; i++) {
        hash = ((hash << 5) - hash) + signatureString.charCodeAt(i);
        hash |= 0;
      }
      const bundleInstanceId = `${bundle.id}-${Math.abs(hash)}`;

      const cartItems = bundlesService.getBundleCartItems(effectiveBundle, appProducts).map((item, idx) => {
        const updatedItem = { ...item, bundleId: bundleInstanceId, bundle_id: bundleInstanceId };

        if (variantToSet) {
          updatedItem.selectedVariant = variantToSet;
        }

        if (toppingsMap && Object.keys(toppingsMap).length > 0 && toppingsMap[item.product.id] && toppingsMap[item.product.id].length > 0) {
          const toppingsArr = toppingsMap[item.product.id];
          updatedItem.displayToppings = toppingsArr;

          if (idx === 0) {
            const toppingsPrice = toppingsArr.reduce((sum, t) => sum + t.price, 0);
            updatedItem.toppings = toppingsArr;
            updatedItem.subtotal = updatedItem.subtotal + toppingsPrice * updatedItem.quantity;
          }
        }

        return updatedItem;
      });

      if (!cartItems || cartItems.length === 0) {
        sonner.error("No products available in this bundle deal");
        return;
      }

      const itemsToDispatch = isReturnMode
        ? cartItems.map(item => ({
          ...item,
          quantity: -Math.abs(item.quantity),
          discount: -Math.abs(item.discount),
          subtotal: -Math.abs(item.subtotal),
        }))
        : cartItems;

      const existingInstance = appCart.filter(x => (x.bundleId || x.bundle_id) === bundleInstanceId);
      if (existingInstance.length > 0) {
        const mergedItems = itemsToDispatch.map(item => {
          const prev = existingInstance.find(x => x.product.id === item.product.id);
          if (!prev) return item;
          return {
            ...prev,
            quantity: prev.quantity + item.quantity,
            discount: prev.discount + item.discount,
            subtotal: prev.subtotal + item.subtotal,
          };
        });
        useCartStore.getState().setCart([...appCart.filter(x => (x.bundleId || x.bundle_id) !== bundleInstanceId), ...mergedItems]);
      } else {
        useCartStore.getState().mergeBundleCartItems(itemsToDispatch);
      }

      const discountText = bundle.discountType === 'percentage'
        ? `${bundle.discountValue}%`
        : `${currency}${bundle.discountValue}`;
      sonner.success(`🎁 ${bundle.name} added — ${discountText} discount applied!`);
      setActiveCombo(null);
    } catch (err) {
      console.error('[Bundle] Add bundle error:', err);
      sonner.error('Could not add bundle — please try again');
    }
  };

  const handleAddBundle = (bundleOrGroup: any) => {
    if (bundleOrGroup.isGroup) {
      setActiveGroup(bundleOrGroup);
    } else if (bundleOrGroup.isCombo) {
      setActiveCombo(bundleOrGroup);
    } else {
      processBundleAdd(bundleOrGroup);
    }
  };

  return { handleBundleQuantity, processBundleAdd, handleAddBundle };
}
