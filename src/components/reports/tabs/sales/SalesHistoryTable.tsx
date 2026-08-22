import React, { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { Sale } from '../../../../types';
import { formatCurrency, getCurrencySymbol } from '../../../../lib/currencies';
import { formatAppDateTime } from '../../../../lib/dateUtils';
import { Pagination, usePagination } from '../../../../shared/ui';
import { ExportButton } from '../../../../shared/export';

interface Props {
  filteredSales: Sale[];
  currency: string;
  country: string;
  users: any[];
}

export function SalesHistoryTable({ filteredSales, currency, country, users }: Props) {
  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredSales, 25);

  const statusLabel = (s: any) => {
    if (s.status === 'completed') return "Completed";
    if (s.status === 'refunded') return "Refunded";
    if (s.status === 'partially_refunded') return "Partially Refunded";
    if (s.status === 'deleted') return "Deleted";
    if (s.status === 'pending' || s.notes?.includes('DRAFT_SALE')) return "Draft";
    return s.status;
  };

  const netTotal = (s: any) =>
    s.status === 'refunded' || s.status === 'deleted' ? 0 :
    s.status === 'partially_refunded' ? (Number(s.total) || 0) - (Number(s.refundedAmount) || 0) :
    (Number(s.total) || 0);

  const exportColumns = [
    { key: 'invoiceNumber', label: "Invoice Number" },
    { key: 'dateTime', label: "Date & Time" },
    { key: 'customer', label: "Customer" },
    { key: 'paymentMethod', label: "Payment Method" },
    { key: 'cashier', label: "Cashier" },
    { key: 'salesman', label: "Salesman" },
    { key: 'revenue', label: "Revenue", format: 'currency' as const },
    { key: 'status', label: "Status" },
  ];

  const exportRows = useMemo(() => filteredSales.map(sale => ({
    invoiceNumber: sale.invoiceNumber || '',
    dateTime: formatAppDateTime(sale.timestamp, country),
    customer: sale.customerName || "Walk-in Customer",
    paymentMethod: sale.paymentMethod,
    cashier: sale.cashier || 'System',
    salesman: sale.salesmanName || '',
    revenue: netTotal(sale),
    status: statusLabel(sale),
  })), [filteredSales, country]);

  return (
    <div className="card shadow-xl border-none bg-white dark:bg-surface overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <Receipt className="h-5 w-5 mr-3 text-primary" />{"Detailed Sales History"}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-black/75 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5">
            {filteredSales.length} {"Total Records"}
          </span>
          <ExportButton
            data={exportRows}
            columns={exportColumns}
            title={"Sales Report"}
            currencySymbol={getCurrencySymbol(currency)}
            className="!min-h-0 !px-4 !py-2.5 !rounded-xl !text-[10px] !font-black !bg-gray-100 dark:!bg-white/5 !text-gray-600 dark:!text-gray-400 !border-gray-200 dark:!border-white/5 hover:!text-primary"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400">{"Order Ref"}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400">{"Date & Time"}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400">{"Customer Details"}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400">{"Cashier"}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400">{"Salesman"}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400 text-right">{"Revenue"}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400 text-center">{"Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {filteredSales.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-600 font-bold uppercase tracking-widest text-xs">{"No transactions found for the selected period."}</td></tr>
            ) : pageItems.map(sale => (
              <tr key={sale.id} className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4"><span className="text-sm font-black text-primary dark:text-emerald-400 uppercase tracking-tighter">{sale.invoiceNumber}</span></td>
                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 font-bold">{formatAppDateTime(sale.timestamp, country)}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{sale.customerName || "Walk-in Customer"}</p>
                  <p className="text-[10px] text-gray-600 uppercase font-black">{sale.paymentMethod} {"Payment"}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-tight">{sale.cashier}</p>
                  <p className="text-[9px] font-black text-primary dark:text-emerald-400 uppercase tracking-widest mt-0.5">@{(users.find((u: any) => u.name === sale.cashier || u.email === sale.cashier)?.username) || 'system'}</p>
                </td>
                <td className="px-6 py-4">
                  {sale.salesmanName ? (
                    <p className="text-xs font-black text-teal-600 uppercase tracking-wider">{sale.salesmanName}</p>
                  ) : (
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">-</p>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-black text-gray-900 dark:text-white text-right">{formatCurrency(sale.total - (sale.refundedAmount || 0), currency)}</td>
                <td className="px-6 py-4 text-center"><span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${sale.status === 'partially_refunded' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-primary/10 text-primary dark:text-emerald-400 border border-primary/20'}`}>{sale.status === 'partially_refunded' ? 'Partial' : 'Completed'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
        {filteredSales.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-600 font-bold uppercase tracking-widest text-[10px]">{"No transactions found"}</div>
        ) : pageItems.map(sale => (
          <div key={sale.id} className="p-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-black text-primary dark:text-emerald-400 uppercase tracking-tighter mb-1">{sale.invoiceNumber}</p>
                <p className="text-[10px] text-gray-600 font-bold">{formatAppDateTime(sale.timestamp, country)}</p>
              </div>
              <p className="text-base font-black text-gray-900 dark:text-white">{formatCurrency(sale.total - (sale.refundedAmount || 0), currency)}</p>
            </div>
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">{sale.customerName || "Walk-in Customer"}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">{sale.paymentMethod}</span>
                  <span className="text-[8px] text-gray-600">•</span>
                  <span className="text-[9px] font-black text-primary/80 uppercase tracking-widest">{"By"} {sale.cashier}</span>
                  {sale.salesmanName && (
                    <>
                      <span className="text-[8px] text-gray-600">•</span>
                      <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest">SM: {sale.salesmanName}</span>
                    </>
                  )}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.15em] ${sale.status === 'partially_refunded' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/10'}`}>{sale.status === 'partially_refunded' ? 'PARTIAL' : 'COMPLETED'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-center">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}
          totalItems={filteredSales.length}
          mode="numbered"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
