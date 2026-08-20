const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function getPrevDayKey(day: string): string {
  const idx = DAYS.indexOf(day as any);
  return DAYS[idx <= 0 ? 6 : idx - 1];
}

export function timeWraps(st: string, et: string): boolean {
  const [sh, sm] = st.split(':').map(Number);
  const [eh, em] = et.split(':').map(Number);
  return (eh * 60 + em) <= (sh * 60 + sm);
}

export function inTimeW(nowMin: number, st: string, et: string): boolean {
  const [sh, sm] = st.split(':').map(Number);
  const [eh, em] = et.split(':').map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return e > s ? (nowMin >= s && nowMin < e) : (nowMin >= s || nowMin < e);
}

export function isBundleInSchedule(b: any): boolean {
  if (!b.scheduleType || b.scheduleType === 'always') return true;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayKey = DAYS[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (b.startDate && todayStr < b.startDate) return false;
  if (b.endDate && todayStr > b.endDate) return false;
  const wraps = b.startTime && b.endTime ? timeWraps(b.startTime, b.endTime) : false;
  const todayIn = b.repeatDays?.length ? b.repeatDays.includes(todayKey) : true;
  const prevIn = b.repeatDays?.length ? b.repeatDays.includes(getPrevDayKey(todayKey)) : false;
  const dayOk = todayIn || (wraps && prevIn && b.endTime && nowMin < (() => { const [eh, em] = b.endTime.split(':').map(Number); return eh * 60 + em; })());
  if (!todayIn && !dayOk) return false;
  if (b.startTime && b.endTime && !inTimeW(nowMin, b.startTime, b.endTime)) return false;
  return true;
}

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
      const allOptIds = (bundle.slots || []).flatMap((s: any) => s.options?.map((o: any) => o.productId) || [])
        ?? (bundle.items || []).map((bi: any) => bi.productId) ?? [];
      const uniqueIds = Array.from(new Set(allOptIds));
      bundleProducts = uniqueIds.map((id: any) => appProducts.find((p: any) => p.id === id)).filter(Boolean);
      totalPrice = finalPrice;
    } else if (bundle.isCombo && bundle.slots) {
      totalPrice = bundle.slots.reduce((sum: number, slot: any) => {
        const maxPriceOpt = slot.options.reduce((max: number, opt: any) => {
          const p = appProducts.find(pr => pr.id === opt.productId);
          return Math.max(max, p ? p.price : 0);
        }, 0);
        return sum + (maxPriceOpt * slot.requiredQuantity);
      }, 0);

      bundleProducts = bundle.slots.reduce((acc: any[], slot: any) => {
        const opts = slot.options.map((opt: any) => {
          const p = appProducts.find(pr => pr.id === opt.productId);
          return p ? { ...p, qty: 1 } : null;
        }).filter(Boolean);
        return [...acc, ...opts];
      }, []);

      finalPrice = totalPrice - bundle.discountValue;

      let minSum = 0, maxSum = 0;
      (bundle.slots || []).forEach((slot: any) => {
        const slotProducts = (slot.options || [])
          .map((opt: any) => appProducts.find((pr: any) => pr.id === opt.productId))
          .filter(Boolean);
        const slotRanges = slotProducts.map(calcVariantRange);
        const minSorted = [...slotRanges].sort((a: any, b: any) => a.min - b.min);
        const maxSorted = [...slotRanges].sort((a: any, b: any) => a.max - b.max);
        const req = Math.min(slot.requiredQuantity, slotRanges.length);
        minSum += minSorted.slice(0, req).reduce((s: number, r: any) => s + r.min, 0);
        maxSum += maxSorted.slice(-req).reduce((s: number, r: any) => s + r.max, 0);
      });
      if (minSum > 0) {
        const dPct = bundle.discountType === 'percentage' ? (bundle.discountValue || 0) / 100 : 0;
        const dFix = bundle.discountType === 'fixed' ? (bundle.discountValue || 0) : 0;
        bundleMinPrice = Math.max(0, bundle.discountType === 'percentage' ? minSum * (1 - dPct) : minSum - dFix);
        bundleMaxPrice = Math.max(0, bundle.discountType === 'percentage' ? maxSum * (1 - dPct) : maxSum - dFix);
      }

      const lowerName = bundle.name.toLowerCase();
      if (lowerName.includes(' - medium') || lowerName.includes(' - small') || lowerName.includes(' - large')) {
        const nameTier = lowerName.includes(' - large') ? 1 : 0;
        const slotProducts = (bundle.slots[0]?.options || [])
          .map((opt: any) => appProducts.find((p: any) => p.id === opt.productId))
          .filter(Boolean);
        if (slotProducts.length > 0) {
          const singlePrices = slotProducts.map((p: any) => {
            if (p.variantData && p.variantData.length > nameTier) {
              return p.variantData[nameTier].priceOverride ?? p.price;
            }
            return p.price;
          });
          const singleBase = Math.min(...singlePrices);
          const dPct = bundle.discountType === 'percentage' ? (bundle.discountValue || 0) / 100 : 0;
          const dFix = bundle.discountType === 'fixed' ? (bundle.discountValue || 0) : 0;
          bundleMinPrice = Math.max(0, bundle.discountType === 'percentage' ? singleBase * (1 - dPct) : singleBase - dFix);
          bundleMaxPrice = bundleMinPrice;
          finalPrice = bundleMinPrice;
        }
      }
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

  const catOrder: Record<string, number> = { pizza: 0, burger: 1, beverage: 2, single_item: 3 };
  return Array.from(map.values()).sort((a, b) => {
    const aCat = a.dealCategory || 'pizza';
    const bCat = b.dealCategory || 'pizza';
    return (catOrder[aCat] ?? 99) - (catOrder[bCat] ?? 99);
  });
}
