import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Ban } from 'lucide-react';
import { localDb } from '../../../lib/localDb';
import { sonner } from '../../../lib/sonner';

export function useProductDetailHistory({
  productStockHistory,
  filterType,
  setFilterType,
  historyPage,
  setHistoryPage,
  setClickedRowId,
  setSelectedSale,
  HISTORY_PER_PAGE,
}: {
  productStockHistory: any[];
  filterType: 'ALL' | 'IN' | 'OUT' | 'RETURN';
  setFilterType: (v: 'ALL' | 'IN' | 'OUT' | 'RETURN') => void;
  historyPage: number;
  setHistoryPage: (v: number) => void;
  setClickedRowId: (v: string | null) => void;
  setSelectedSale: (v: any | null) => void;
  HISTORY_PER_PAGE: number;
}) {
  const movementHistory = useMemo(() => {
    const history: any[] = [];

    (productStockHistory as any[]).forEach(h => {
      const qty = Number(h.changeQty || 0);
      const isOut = qty < 0;
      const displayType = isOut ? 'OUT' : 'IN';
      const displayQty = Math.abs(qty);
      const note = (h.note || '').toLowerCase();

      let label = 'Movement';
      let color = isOut ? 'text-red-500' : 'text-primary';
      let bg = isOut ? 'bg-red-500/10' : 'bg-primary/10';
      let icon = isOut ? ArrowUpRight : ArrowDownLeft;

      if (note.includes('edit')) {
        label = 'Sale Edited';
        color = 'text-purple-500 font-black';
        bg = 'bg-purple-500/10';
        icon = isOut ? ArrowUpRight : ArrowDownLeft;
      } else if (note.includes('deleted')) {
        label = 'Sale Deleted';
        color = 'text-yellow-500 font-black';
        bg = 'bg-yellow-500/10';
        icon = isOut ? ArrowUpRight : ArrowDownLeft;
      } else if (h.type === 'sale') {
        label = 'POS Sale';
        color = 'text-red-500';
        bg = 'bg-red-500/10';
        icon = ArrowUpRight;
      } else if (h.type === 'return') {
        label = note.includes('partial') ? 'Partial Refund' : 'POS Return';
        color = 'text-yellow-500 font-black';
        bg = 'bg-yellow-500/10';
        icon = ArrowDownLeft;
      } else if (h.type === 'purchase' || h.type === 'stock_in') {
        label = h.type === 'stock_in' ? 'Stock IN' : 'Purchase';
      } else if (h.type === 'initial') {
        label = 'Initial Stock';
      } else if (h.type === 'adjustment' || h.type === 'adjustment_out') {
        label = 'Adjustment';
        color = isOut ? 'text-orange-500' : 'text-amber-500';
        bg = isOut ? 'bg-orange-500/10' : 'bg-amber-500/10';
        icon = isOut ? Ban : ArrowDownLeft;
      }

      const safeDate = h.createdAt ? (h.createdAt instanceof Date ? h.createdAt : new Date(h.createdAt))
        : (h.timestamp ? (h.timestamp instanceof Date ? h.timestamp : new Date(h.timestamp)) : new Date());

      history.push({
        id: h.id,
        date: isNaN(safeDate.getTime()) ? new Date() : safeDate,
        type: displayType,
        label,
        qty: displayQty,
        reference: (h.referenceId ? String(h.referenceId).slice(-6).toUpperCase() : (h.note ? h.note.slice(0, 14) : '')),
        fullReference: h.referenceId,
        entity: h.cashierName || 'System',
        user: h.cashierName || 'System',
        note: h.note,
        icon,
        color,
        bg
      });
    });

    const rawHistory = [...history];

    return rawHistory
      .filter(h => filterType === 'ALL' || h.type === filterType || (filterType === 'RETURN' && h.label.includes('Return')))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productStockHistory, filterType]);

  const totalHistoryPages = Math.ceil(movementHistory.length / HISTORY_PER_PAGE);
  const paginatedHistory = movementHistory.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE
  );

  const handleRowClick = async (h: any) => {
    const isRetailTransaction = h.label?.includes('Sale') || h.label?.includes('Return');

    if (isRetailTransaction && h.fullReference) {
      const sale = await localDb.sales.get(h.fullReference);
      if (!sale) {
        sonner.error("This invoice has been deleted.");
        return;
      }
      setClickedRowId(h.id);
      setSelectedSale(sale);
    }
  };

  return {
    movementHistory, totalHistoryPages, paginatedHistory, handleRowClick,
  };
}
