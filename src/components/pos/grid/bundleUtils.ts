export function buildGroupedBundles(rawBundles: any[], appProducts: any[]): any[] {
  const processed = rawBundles.map(bundle => {
    let totalPrice = 0;
    let finalPrice = 0;
    let bundleMinPrice: number | null = null;
    let bundleMaxPrice: number | null = null;
    let bundleProducts: any[] = [];

    const calcVariantRange = (p: any) => {
      if (p.variantData && p.variantData.length > 0) {
        const prices = p.variantData.map((vd: any) => vd.priceOverride ?? p.price).filter((pr: number) => pr > 0);
        return { min: Math.min(...prices), max: Math.max(...prices) };
      }
      return { min: p.price, max: p.price };
    };

    if (bundle.overridePrice !== undefined && bundle.overridePrice !== null) {
      finalPrice = bundle.overridePrice;
      const allOptIds = (bundle.items || []).map((bi: any) => bi.productId);
      const uniqueIds = Array.from(new Set(allOptIds));
      bundleProducts = uniqueIds.map((id: any) => appProducts.find((p: any) => p.id === id)).filter(Boolean);
      totalPrice = finalPrice;
    } else {
      totalPrice = (bundle.items || []).reduce((sum: number, bi: any) => {
        const p = appProducts.find(pr => pr.id === bi.productId);
        return sum + (p ? p.price * bi.quantity : 0);
      }, 0);

      bundleProducts = (bundle.items || []).map((bi: any) => {
        const p = appProducts.find(pr => pr.id === bi.productId);
        return p ? { ...p, qty: bi.quantity } : null;
      }).filter(Boolean);

      const discountAmount = bundle.discountType === 'percentage'
        ? (totalPrice * bundle.discountValue) / 100
        : Math.min(bundle.discountValue, totalPrice);
      finalPrice = totalPrice - discountAmount;

      const ranges = bundleProducts.map(calcVariantRange);
      const itemMin = ranges.reduce((sum: number, r: any, i: number) => sum + r.min * ((bundle.items?.[i]?.quantity) || 1), 0);
      const itemMax = ranges.reduce((sum: number, r: any, i: number) => sum + r.max * ((bundle.items?.[i]?.quantity) || 1), 0);
      const discPct = bundle.discountType === 'percentage' ? bundle.discountValue / 100 : 0;
      const discFixed = bundle.discountType === 'fixed' ? bundle.discountValue : 0;
      bundleMinPrice = Math.max(0, bundle.discountType === 'percentage' ? itemMin * (1 - discPct) : itemMin - discFixed);
      bundleMaxPrice = Math.max(0, bundle.discountType === 'percentage' ? itemMax * (1 - discPct) : itemMax - discFixed);
    }

    return {
      ...bundle,
      totalPrice,
      finalPrice,
      bundleMinPrice,
      bundleMaxPrice,
      bundleProducts
    };
  });

  const map = new Map<string, any>();
  processed.forEach(b => {
    if (b.name.includes(' - ')) {
      const [baseName, ...rest] = b.name.split(' - ');
      const variantName = rest.join(' - ');
      if (!map.has(baseName)) {
        map.set(baseName, { isGroup: true, id: `group-${baseName}`, name: baseName, bundles: [], baseName });
      }
      map.get(baseName).bundles.push({ ...b, variantName });
    } else {
      map.set(b.id, { isGroup: false, ...b });
    }
  });

  return Array.from(map.values());
}
