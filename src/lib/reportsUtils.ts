import { Sale } from '../types';

export const getItemCOGS = (item: any): { cost: number; isEstimated: boolean } => {
  if (item.purchaseCost !== undefined && item.purchaseCost !== 0) {
    const baseQty = item.weight ? Number(item.weight) : (Number(item.quantity) || 0);
    const sign = baseQty < 0 ? -1 : 1;
    return { cost: sign * Math.abs(item.purchaseCost), isEstimated: false };
  }
  if (item.product?.cost && item.product.cost > 0) {
    const qty = item.weight ? item.weight : (item.quantity || 1);
    return { cost: item.product.cost * qty, isEstimated: true };
  }
  return { cost: 0, isEstimated: true };
};

export function getEffectiveTotal(sale: any): number {
  if (sale.status === 'refunded' || sale.status === 'deleted') return 0;
  if (sale.status === 'partially_refunded') return (sale.total || 0) - (sale.refundedAmount || 0);
  return sale.total || 0;
}

export function netItemQty(item: any): number {
  const base = item?.weight ? Number(item.weight) : (Number(item?.quantity) || 0);
  return base - (Number(item?.refundedQuantity) || 0);
}

export function getItemRevenue(item: any, sale: Sale): number {
  const extraChargesTotal = (sale.extraCharges || []).reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
  const netBillTotal = (getEffectiveTotal(sale)) - (Number(sale.taxAmount) || 0) - extraChargesTotal;
  const saleItemsSubtotal = sale.items?.reduce((sum: number, i: any) => sum + (Number(i.subtotal) || 0), 0) || 0;
  const distributionRatio = saleItemsSubtotal > 0 ? netBillTotal / saleItemsSubtotal : 1;
  return (Number(item.subtotal) || 0) * distributionRatio;
}

export const isDraftSale = (sale: any) =>
  sale.status === 'pending' ||
  sale.invoiceNumber?.startsWith('DRAFT-') ||
  sale.notes?.includes('Draft sale') ||
  sale.notes?.includes('DRAFT_SALE');
