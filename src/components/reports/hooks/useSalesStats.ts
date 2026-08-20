import { useMemo } from 'react';
import { netItemQty, getItemRevenue, getEffectiveTotal, getItemCOGS } from '../../../lib/reportsUtils';

export function useSalesStats(filteredSales: any[], appSettings: any) {
  const salesData = useMemo(() => {
    const salesByDay: Record<string, { date: string; amount: number; count: number; taxAmount: number }> = {};
    filteredSales.forEach(sale => {
      const date = sale.date || sale.timestamp;
      const formattedDate = typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0];
      if (!salesByDay[formattedDate]) {
        salesByDay[formattedDate] = { date: formattedDate, amount: 0, count: 0, taxAmount: 0 };
      }
      salesByDay[formattedDate].amount += getEffectiveTotal(sale);
      salesByDay[formattedDate].taxAmount += Number(sale.taxAmount) || 0;
      salesByDay[formattedDate].count += 1;
    });
    return Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredSales.filter(s => s.status === 'completed' || s.status === 'partially_refunded').forEach(sale => {
      sale.items.forEach((item: any) => {
        const productId = item.product?.id || 'deleted';
        if (!productSales[productId]) {
          productSales[productId] = { name: item.product?.name || 'Deleted Product', quantity: 0, revenue: 0 };
        }
        productSales[productId].quantity += netItemQty(item);
        productSales[productId].revenue += getItemRevenue(item, sale);
      });
    });
    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredSales]);

  const featureAnalytics = useMemo(() => {
    let serviceRevenue = 0; let productRevenue = 0; let modifiersRevenue = 0;
    const variantSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredSales.filter(s => s.status === 'completed' || s.status === 'partially_refunded').forEach(sale => {
      sale.items.forEach((item: any) => {
        const itemRev = getItemRevenue(item, sale);
        if (item.product?.isService) { serviceRevenue += itemRev; } else { productRevenue += itemRev; }
        if (item.selectedModifiers) item.selectedModifiers.forEach((mod: any) => { modifiersRevenue += (mod.price || 0) * netItemQty(item); });
        if (item.addonItems) item.addonItems.forEach((addon: any) => { modifiersRevenue += addon.subtotal || 0; });
        if (item.toppings) item.toppings.forEach((topping: any) => { modifiersRevenue += (topping.price || 0) * netItemQty(item); });
        if (item.selectedVariant) {
          const varKey = `${item.product?.name} (${item.selectedVariant})`;
          if (!variantSales[varKey]) variantSales[varKey] = { name: varKey, quantity: 0, revenue: 0 };
          variantSales[varKey].quantity += netItemQty(item);
          variantSales[varKey].revenue += itemRev;
        }
      });
    });
    return { serviceRevenue, productRevenue, modifiersRevenue, topVariants: Object.values(variantSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5) };
  }, [filteredSales]);

  const categoryData = useMemo(() => {
    const categories: Record<string, { name: string; value: number }> = {};
    filteredSales.filter(s => s.status === 'completed' || s.status === 'partially_refunded').forEach(sale => {
      sale.items.forEach((item: any) => {
        const category = item.product?.category || 'Uncategorized';
        if (!categories[category]) categories[category] = { name: category, value: 0 };
        categories[category].value += item.subtotal;
      });
    });
    return Object.values(categories);
  }, [filteredSales]);

  const saleTypeData = useMemo(() => {
    const types: Record<string, { name: string; value: number }> = { retail: { name: 'Retail', value: 0 }, wholesale: { name: 'Wholesale', value: 0 } };
    filteredSales.filter(s => s.status === 'completed' || s.status === 'partially_refunded').forEach(sale => {
      if (!sale) return;
      const type = sale.saleType || 'retail';
      if (types[type]) types[type].value += getEffectiveTotal(sale);
    });
    const retailEnabled = appSettings?.retailEnabled ?? true;
    const wholesaleEnabled = appSettings?.wholesaleEnabled ?? false;
    return Object.values(types).filter(t => {
      if (t.name === 'Retail' && !retailEnabled) return false;
      if (t.name === 'Wholesale' && !wholesaleEnabled) return false;
      return t.value > 0;
    });
  }, [filteredSales, appSettings]);

  const totalCostOfGoods = useMemo(() => {
    return filteredSales.filter(s => s.status === 'completed' || s.status === 'partially_refunded').reduce((sum, sale) => {
      const itemsCost = sale.items.reduce((itemSum: number, item: any) => {
        const baseQty = item.weight ? Number(item.weight) : (Number(item.quantity) || 0);
        const net = netItemQty(item);
        const ratio = baseQty > 0 ? net / baseQty : 0;
        const { cost } = getItemCOGS(item);
        return itemSum + cost * ratio;
      }, 0);
      const giftsCost = (sale.freeGifts || []).reduce((gSum: number, g: any) => gSum + (Number(g.purchaseCost) || 0), 0);
      return sum + itemsCost + giftsCost;
    }, 0);
  }, [filteredSales]);

  return { salesData, topProducts, featureAnalytics, categoryData, saleTypeData, totalCostOfGoods };
}
