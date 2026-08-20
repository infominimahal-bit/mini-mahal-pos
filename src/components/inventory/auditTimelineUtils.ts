import { ShoppingCart, ArrowDownLeft, ArrowUpRight, Settings, Package, History } from 'lucide-react';

export function buildUnifiedHistory(stockHist: any[], purchaseRecs: any[]) {
  return [
    ...stockHist.map(h => ({
      id: h.id,
      date: new Date(h.createdAt || h.created_at || h.timestamp),
      type: h.type,
      productId: h.productId || h.product_id,
      productName: h.productName || h.product_name || 'Unknown Product',
      qty: Number(h.changeQty || h.change_qty) || 0,
      user: h.cashierName || h.cashier_name || h.addedBy || h.added_by || 'System',
      reference: h.referenceId || h.reference_id,
      note: h.note || h.notes
    })),
    ...purchaseRecs.filter(p => !stockHist.some(h => h.reference_id === p.id)).map(p => ({
      id: p.id,
      date: new Date(p.date),
      type: p.type?.toLowerCase() || 'purchase',
      productId: p.productId,
      productName: p.productName || 'Unknown Product',
      qty: Number(p.quantity) || 0,
      user: p.addedBy || 'System',
      reference: p.id,
      note: p.notes
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function categorize(history: any[]) {
  const inTypes = ['purchase', 'initial'];
  const ins = history.filter(h => inTypes.includes(h.type) || (h.type === 'adjustment' && h.qty > 0));
  const outs = history.filter(h => h.type === 'sale' || (h.type === 'adjustment' && h.qty < 0));
  const rets = history.filter(h => h.type === 'return');

  return {
    all: history,
    in: ins,
    out: outs,
    return: rets,
    counts: {
      all: history.length,
      in: ins.length,
      out: outs.length,
      return: rets.length
    }
  };
}

export function getEventConfig(type: string, qty: number) {
  switch (type) {
    case 'sale':
      return { icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Item Sold', qtyPrefix: '-' };
    case 'return':
      return { icon: ArrowDownLeft, color: 'text-primary', bg: 'bg-primary/10', label: 'Returned', qtyPrefix: '+' };
    case 'purchase':
      return { icon: ArrowUpRight, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Stock In', qtyPrefix: '+' };
    case 'adjustment':
      return { icon: Settings, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Adjusted', qtyPrefix: qty > 0 ? '+' : '' };
    case 'initial':
      return { icon: Package, color: 'text-gray-600', bg: 'bg-gray-500/10', label: 'Opening', qtyPrefix: '+' };
    default:
      return { icon: History, color: 'text-gray-600', bg: 'bg-gray-400/10', label: 'Log', qtyPrefix: '' };
  }
}

export function resolveProductName(productId: string, fallback: string, appProducts: any[]) {
  const p = appProducts.find(item => item.id === productId);
  if (p) return p.name;

  if (fallback === 'Unknown Product' || !fallback) return 'Deleted/Legacy Product';

  return fallback;
}
