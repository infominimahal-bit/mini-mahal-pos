import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Printer, Edit, Trash2, Hash } from 'lucide-react';
import { formatAppDate, formatAppTime } from '../../lib/dateUtils';
import { formatCurrency } from '../../lib/currencies';
import { Sale } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCartStore, useCustomersStore, useSalesStore } from '../../stores';
import { salesService } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { Badge, Button, Pagination } from '../../shared/ui';
import { getStatusTone } from './TransactionTable.utils';

interface TransactionTableProps {
  transactions: Sale[];
  filteredCount: number;
  isSearchingRemote: boolean;
  currency: string;
  country: string;
  canEditSale: boolean;
  canDeleteSale: boolean;
  onView: (sale: Sale) => void;
  onReprint: (sale: Sale) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export function TransactionTable({
  transactions,
  filteredCount,
  isSearchingRemote,
  currency,
  country,
  canEditSale,
  canDeleteSale,
  onView,
  onReprint,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: TransactionTableProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const appCustomers = useCustomersStore(s => s.customers);

  const handleEditSale = async (tx: Sale) => {
    const res = await sonner.confirm('Edit Sale?', 'Load items and notes to cart for editing?', 'Yes');
    if (res.isConfirmed) {
      try {
        useCartStore.getState().clearCart();
        tx.items.forEach(item => useCartStore.getState().addToCart(item));
        useCartStore.getState().setNotes(tx.notes || '');
        useCartStore.getState().setEditingSaleId(tx.id);
        if (tx.customerId) {
          const customer = appCustomers.find(c => c.id === tx.customerId);
          if (customer) useCartStore.getState().setSelectedCustomer(customer);
        }
        sonner.success('Loaded to POS for editing.');
        navigate('/pos');
      } catch { sonner.error('Error.'); }
    }
  };
  const handleDeleteSale = async (tx: Sale) => {
    const isGhost = !tx.items || tx.items.length === 0 || !tx.total;
    const title = isGhost ? 'Delete Empty Record?' : 'Delete Sale?';
    const msg = isGhost ? 'Remove this empty/ghost row?' : 'Revert all records?';
    const res = await sonner.confirm(title, msg, 'Delete');
    if (res.isConfirmed) {
      try {
        await salesService.delete(tx.id, profile?.name || 'Admin');
        useSalesStore.getState().deleteSale(tx.id);
        sonner.success('Deleted.');
      } catch (err) {
        if (/APPROVAL_REQUIRED|FORBIDDEN/i.test(String((err as any)?.message))) {
          sonner.error('Admin approval required to delete a sale.');
        } else {
          sonner.error('Error.');
        }
      }
    }
  };
  return (
    <div className="bg-white dark:bg-surface rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="table w-full">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest">{"Receipt"}</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest">{"Date"}</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest">{"Customer"}</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest">{"Total"}</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest">{"Status"}</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest">{"Action"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  {isSearchingRemote ? "Searching all records..." : "No sales found for this filter."}
                </td>
              </tr>
            ) : transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors border-b border-gray-200 dark:border-white/5">
                <td className="px-4 py-3">
                  <div className="text-sm font-black text-gray-900 dark:text-white">#{tx.invoiceNumber || tx.receiptNumber}</div>
                  {tx.dcNumber && (
                    <div className="flex items-center gap-1 mt-1 text-[8px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full w-fit uppercase tracking-tighter">
                      <Hash className="w-2 h-2" /> DC: {tx.dcNumber}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatAppDate(tx.timestamp, country)}</div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">{formatAppTime(tx.timestamp, country, false)}</div>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <div>{tx.customerName || "Walk-in"}</div>
                  {tx.cashier && <div className="text-[9px] font-bold text-primary uppercase mt-0.5">{"By"} {tx.cashier}</div>}
                  {tx.salesmanName && <div className="text-[9px] font-bold text-teal-600 uppercase mt-0.5">SM: {tx.salesmanName}</div>}
                </td>
                <td className="px-4 py-3 text-sm font-black text-primary dark:text-emerald-400">
                  <div>{formatCurrency(tx.total, currency)}</div>
                  {tx.refundedAmount > 0 && (
                    <div className="text-[9px] font-bold text-rose-500 mt-0.5">
                      -{formatCurrency(tx.refundedAmount, currency)} {tx.status === 'partially_refunded' ? 'Refunded' : ''}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={getStatusTone(tx.status)} size="sm">
                    {tx.status || 'Ghost / Empty'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => onView(tx)} className="!min-h-0 !p-1.5 !rounded-lg !text-primary hover:!bg-emerald-50 dark:hover:!bg-primary/10" title="View Detail"><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" onClick={() => onReprint(tx)} className="!min-h-0 !p-1.5 !rounded-lg !text-blue-600 hover:!bg-blue-50 dark:hover:!bg-blue-500/10" title="Quick Print"><Printer className="h-4 w-4" /></Button>
                  {canEditSale && (
                    <Button
                      variant="ghost"
                      onClick={async (e) => { e.stopPropagation(); await handleEditSale(tx); }}
                      className="!min-h-0 !p-1.5 !rounded-lg !text-amber-600 hover:!bg-amber-50"
                      title="Edit Sale"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDeleteSale && (
                    <Button
                      variant="ghost"
                      onClick={async (e) => { e.stopPropagation(); await handleDeleteSale(tx); }}
                      className="!min-h-0 !p-1.5 !rounded-lg !text-rose-600 hover:!bg-rose-50"
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile View */}
      <div className="lg:hidden p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {transactions.length === 0 ? (
          <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">
            {isSearchingRemote ? "Searching all records..." : "No sales found for this filter."}
          </div>
        ) : transactions.map(tx => (
          <div key={tx.id} onClick={() => onView(tx)} className="p-3 rounded-[1.5rem] bg-white dark:bg-surface border border-gray-200 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start gap-1">
              <p className="text-[8px] font-black text-gray-600 dark:text-gray-400 uppercase mb-1">#{tx.invoiceNumber || tx.receiptNumber}</p>
              {tx.status !== 'completed' && (
                <Badge tone={getStatusTone(tx.status)} size="sm">
                  {tx.status}
                </Badge>
              )}
            </div>
            <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase truncate mb-1">{tx.customerName || "Walk-in"}</h3>
            {tx.salesmanName && <p className="text-[8px] font-bold text-teal-600 uppercase mb-2">SM: {tx.salesmanName}</p>}
            <div className="flex flex-col">
              <span className={`text-[11px] font-black text-primary dark:text-primary ${tx.refundedAmount > 0 ? 'line-through text-gray-400 text-[10px]' : ''}`}>
                {formatCurrency(tx.total, currency)}
              </span>
              {tx.refundedAmount > 0 && (
                <span className="text-[11px] font-black text-rose-500 leading-none mt-0.5">
                  {formatCurrency(tx.total - tx.refundedAmount, currency)}
                </span>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-1.5">
              <Button variant="ghost" onClick={(e) => { e.stopPropagation(); onView(tx); }} className="!min-h-0 !p-1.5 !rounded-lg !text-primary hover:!bg-emerald-50 dark:hover:!bg-primary/10" title="View Detail"><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" onClick={(e) => { e.stopPropagation(); onReprint(tx); }} className="!min-h-0 !p-1.5 !rounded-lg !text-blue-600 hover:!bg-blue-50 dark:hover:!bg-blue-500/10" title="Quick Print"><Printer className="h-4 w-4" /></Button>
              {canEditSale && (
                <Button
                  variant="ghost"
                  onClick={async (e) => { e.stopPropagation(); await handleEditSale(tx); }}
                  className="!min-h-0 !p-1.5 !rounded-lg !text-amber-600 hover:!bg-amber-50"
                  title="Edit Sale"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDeleteSale && (
                <Button
                  variant="ghost"
                  onClick={async (e) => { e.stopPropagation(); await handleDeleteSale(tx); }}
                  className="!min-h-0 !p-1.5 !rounded-lg !text-rose-600 hover:!bg-rose-50"
                  title="Delete Permanently"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Pagination */}
      <div className="px-4 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          totalItems={filteredCount}
          mode="prevNext"
          className="w-full"
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
