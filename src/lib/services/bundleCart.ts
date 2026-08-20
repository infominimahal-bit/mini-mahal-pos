import {
  Bundle,
  Product,
  CartItem,
} from '../../types';

/**
 * Converts a bundle into CartItems with PROPORTIONAL discount (Option A).
 * Each product's discount is proportional to its price share of the bundle total.
 */
export function getBundleCartItems(bundle: Bundle, products: Product[], variantTier?: number): CartItem[] {
  if (!bundle.items || bundle.items.length === 0) return [];

  // Build line items with resolved product data.
  // E3: when a size tier is selected (e.g. Large), use the variant priceOverride instead of
  // the base product.price — otherwise the cart charged the Small price while the modal showed
  // the Large price, over-charging the customer. variantTier is optional so POS (which prices
  // bundles at base) is unaffected when omitted.
  const lines: { product: Product; quantity: number; linePrice: number }[] = [];
  for (const bi of bundle.items) {
    const product = products.find(p => p.id === bi.productId);
    if (!product) continue;
    const tierPrice = (typeof variantTier === 'number' && product.variantData && product.variantData.length > variantTier)
      ? (product.variantData[variantTier].priceOverride ?? product.price)
      : product.price;
    lines.push({
      product,
      quantity: bi.quantity,
      linePrice: tierPrice * bi.quantity,
    });
  }

  if (lines.length === 0) return [];

  const totalBundlePrice = lines.reduce((sum, l) => sum + l.linePrice, 0);

  // Calculate total discount amount. If the bundle has a fixed overridePrice, the
  // effective discount is the difference between the summed item price and that
  // override (P1: previously overridePrice was ignored, so the cart charged the
  // items-minus-discount total instead of the advertised fixed price).
  const overridePrice = typeof bundle.overridePrice === 'number' && bundle.overridePrice >= 0
    ? bundle.overridePrice
    : null;
  const totalDiscountAmount = overridePrice !== null
    ? Math.max(0, Math.round((totalBundlePrice - overridePrice) * 100) / 100)
    : (bundle.discountType === 'percentage'
      ? (totalBundlePrice * bundle.discountValue) / 100
      : Math.min(bundle.discountValue, totalBundlePrice));

  // Apply proportional discount to each line
  const lineDiscounts = lines.map(line => {
    const proportion = totalBundlePrice > 0 ? line.linePrice / totalBundlePrice : 0;
    return Math.round(totalDiscountAmount * proportion * 100) / 100;
  });
  // Fix per-line rounding drift so Σ lineDiscount === totalDiscountAmount exactly (B4),
  // otherwise the realised bundle discount leaks/over-charges by up to a few cents.
  const discountSum = lineDiscounts.reduce((s, d) => s + d, 0);
  const drift = Math.round((totalDiscountAmount - discountSum) * 100) / 100;
  if (drift !== 0 && lineDiscounts.length > 0) {
    lineDiscounts[lineDiscounts.length - 1] = Math.round((lineDiscounts[lineDiscounts.length - 1] + drift) * 100) / 100;
  }

  return lines.map((line, idx) => {
    const lineDiscount = lineDiscounts[idx];
    const subtotal = line.linePrice - lineDiscount;

    return {
      product: line.product,
      quantity: line.quantity,
      discount: lineDiscount,
      discountValue: bundle.discountValue,
      discountType: bundle.discountType,
      subtotal,
      bundleId: bundle.id,
      bundleName: bundle.name,
      bundleHideItemPrices: bundle.hideItemPrices || false,
    } as CartItem;
  });
}
