import { useMemo } from 'react';
import { netItemQty, getItemRevenue } from '../../../lib/reportsUtils';

export function useInventoryStats(appProducts: any[], filteredSales: any[], reportType: string) {
  const inventoryData = useMemo(() => {
    const inventoryStats = appProducts.map(product => {
      const isInfinite = product.isInfiniteStock === true;
      let soldQuantity = 0;
      let revenue = 0;
      filteredSales.filter(s => s.status === 'completed' || s.status === 'partially_refunded').forEach(sale => {
        sale.items.forEach((item: any) => {
          if (item.product?.id === product.id) {
            soldQuantity += netItemQty(item);
            revenue += getItemRevenue(item, sale);
          }
        });
      });
      const stockValue = isInfinite ? 0 : Math.max(0, product.stock) * (product.cost || 0);
      const potentialRevenue = isInfinite ? 0 : Math.max(0, product.stock) * (product.isWeightBased ? (product.pricePerUnit || 0) : product.price);
      const turnoverRatio = isInfinite ? 0 : (product.stock > 0 ? (soldQuantity / product.stock) : (soldQuantity > 0 ? 100 : 0));
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        currentStock: isInfinite ? '∞' : product.stock,
        minStock: product.minStock,
        stockStatus: isInfinite ? 'Infinity Mode' : (product.stock <= 0 ? 'Out of Stock' : product.stock <= (product.minStock || 5) ? 'Low Stock' : 'In Stock'),
        isInfinite,
        costPrice: product.cost || 0,
        sellingPrice: product.isWeightBased ? (product.pricePerUnit || 0) : product.price,
        stockValue: stockValue,
        potentialRevenue: potentialRevenue,
        soldQuantity: soldQuantity,
        revenue: revenue,
        turnoverRatio: turnoverRatio,
        profitMargin: product.cost ? (
          product.isWeightBased ? (((product.pricePerUnit || 0) - product.cost) / (product.pricePerUnit || 1) * 100) : ((product.price - product.cost) / product.price * 100)
        ) : 0,
        active: product.active
      };
    });
    return inventoryStats.sort((a, b) => {
      if (reportType === 'inventory') {
        if (a.stockStatus !== b.stockStatus) {
          const statusOrder = { 'Out of Stock': 0, 'Low Stock': 1, 'In Stock': 2, 'Infinity Mode': 3 };
          return (statusOrder[a.stockStatus as keyof typeof statusOrder] || 99) - (statusOrder[b.stockStatus as keyof typeof statusOrder] || 99);
        }
        return (b.stockValue || 0) - (a.stockValue || 0);
      }
      return 0;
    });
  }, [appProducts, filteredSales, reportType]);
  return { inventoryData };
}
