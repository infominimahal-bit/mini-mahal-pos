import { useMemo } from 'react';
import { Product, PurchaseRecord, Sale } from '../../../types';

export function useProductDetailLedger({
  product,
  appSales,
  appPurchaseRecords,
  productStockHistory,
  saleById,
  isInfinite,
}: {
  product: Product;
  appSales: any[];
  appPurchaseRecords: any[];
  productStockHistory: any[];
  saleById: Map<string, any>;
  isInfinite: boolean;
}) {
  const productSales = useMemo(() => {
    return (appSales || []).filter((s: Sale) =>
      (s.status === 'completed' || s.status === 'partially_refunded' || s.status === 'refunded') &&
      s.items?.some(item => item.product?.id === product.id)
    );
  }, [appSales, product.id]);

  const productPurchases = useMemo(() => {
    return (appPurchaseRecords || []).filter((r: PurchaseRecord) => {
      const isDuplicateSale = r.type === 'Sale' ||
        r.type === 'Return' ||
        r.notes?.includes('Invoice #') ||
        r.supplier === 'Sale' ||
        r.supplier === 'SALE';

      return r.productId === product.id && !isDuplicateSale;
    });
  }, [appPurchaseRecords, product.id]);

  const ledgerKpis = useMemo(() => {
    let sold = 0, revenue = 0, cogs = 0;
    const unitCost = product.cost || 0;
    for (const h of productStockHistory) {
      const qty = Math.abs(Number(h.changeQty) || 0);
      if (!qty) continue;
      const sale = saleById.get(h.referenceId || '');
      let item: any = sale?.items?.find((i: any) => i.product?.id === product.id);
      if (!item && sale) {
        for (const it of sale.items || []) {
          const a = (it.addonItems || []).find((ad: any) => ad.addon?.addonProductId === product.id);
          if (a) { item = a; break; }
        }
      }
      const itemQty = item ? Math.abs(Number(item.weight ? item.weight : item.quantity) || 0) : 0;
      const scale = itemQty > 0 ? qty / itemQty : 1;

      // Retroactive fix for old data where deleted POS returns were saved as 'return' type instead of 'sale'.
      let effectiveType = h.type;
      const hNote = (h.note || '').toLowerCase();
      if (hNote.includes('deleted')) {
          const rawChange = Number(h.changeQty) || 0;
          effectiveType = rawChange < 0 ? 'sale' : 'return';
      }

      if (effectiveType === 'sale') {
        sold += qty;
        if (item) revenue += (Number(item.subtotal) || 0) * scale;
        cogs += unitCost * qty;
      } else if (effectiveType === 'return') {
        sold -= qty;
        if (item) revenue -= (Number(item.subtotal) || 0) * scale;
        cogs -= unitCost * qty;
      }
    }
    return { sold, revenue, cogs };
  }, [productStockHistory, saleById, product.id, product.cost]);

  const totalSoldUnits = ledgerKpis.sold;
  const totalRevenue = ledgerKpis.revenue;
  const totalCOGS = ledgerKpis.cogs;
  const grossProfit = totalRevenue - totalCOGS;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const sellingPrice = product.isWeightBased ? (product.pricePerUnit || 0) : product.price;

  const stockValueCost = isInfinite ? 0 : product.stock * (product.cost || 0);
  const stockValueSale = isInfinite ? 0 : product.stock * sellingPrice;

  const isLow = !isInfinite && product.stock <= (product.minStock || 0) && product.stock > 0;
  const isOut = !isInfinite && product.stock <= 0;
  const maxStock = product.targetStock || Math.max(product.stock, (product.minStock || 0) * 3, 50);
  const stockPct = Math.max(0, Math.min(100, maxStock > 0 ? (product.stock / maxStock) * 100 : 0));

  return {
    productSales, productPurchases, ledgerKpis,
    totalSoldUnits, totalRevenue, totalCOGS, grossProfit, profitMargin,
    sellingPrice, stockValueCost, stockValueSale,
    isLow, isOut, maxStock, stockPct,
  };
}
