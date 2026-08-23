import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { Customer, CustomerLedger } from '../../types';
import { fetchCustomerLedger } from '../../lib/services/customerLedgerService';
import { useSettingsStore } from '../../stores';
import { formatCurrency } from '../../lib/currencies';
import { formatAppDateTime } from '../../lib/dateUtils';
import { Badge, EmptyState, Pagination, usePagination } from '../../shared/ui';
import { SkeletonLoader } from '../../shared/ui/SkeletonLoader';

interface Props {
  customer: Customer;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  sale_credit: { label: 'Credit Sale', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  sale: { label: 'Credit Sale', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  payment_received: { label: 'Payment', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  payment: { label: 'Payment', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  refund: { label: 'Refund', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  adjustment: { label: 'Adjustment', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  opening: { label: 'Opening', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300' },
};

export function CustomerLedgerTab({ customer }: Props) {
  const settings = useSettingsStore(s => s.settings);
  const currency = settings?.currency || 'PKR';
  const [entries, setEntries] = useState<CustomerLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerLedger(customer.id);
      setEntries(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e: any) {
      setError(e?.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [customer.id]);

  const { pageItems, page, totalPages, goToPage, pageSize, setPageSize } = usePagination(entries, 15);
  const balance = customer.balance || 0;
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  if (loading) return <SkeletonLoader rows={6} />;
  if (error) return (
    <div className="text-center py-8 text-red-500 text-sm">{error}
      <button onClick={load} className="ml-2 underline">Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 p-3">
          <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-0.5">Total Credit Given</div>
          <div className="text-base font-bold text-red-700 dark:text-red-300">{formatCurrency(totalDebit, currency)}</div>
        </div>
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 p-3">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-0.5">Total Received</div>
          <div className="text-base font-bold text-green-700 dark:text-green-300">{formatCurrency(totalCredit, currency)}</div>
        </div>
        <div className={`rounded-xl border p-3 ${balance > 0
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/30'
          : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/30'}`}>
          <div className={`text-xs font-medium mb-0.5 ${balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Outstanding</div>
          <div className={`text-base font-bold ${balance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {formatCurrency(balance, currency)}
          </div>
        </div>
      </div>

      {/* Refresh */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{entries.length} entries</span>
        <button onClick={load} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Ledger table */}
      {entries.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No ledger entries" description="No credit transactions yet for this customer" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-3 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Type</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Note / Ref</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-red-600 dark:text-red-400">Debit</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-green-600 dark:text-green-400">Credit</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {pageItems.map(entry => {
                  const meta = TYPE_LABELS[entry.type] || { label: entry.type, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatAppDateTime(entry.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                        {entry.note || entry.reference || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {entry.debit > 0
                          ? <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                              <ArrowUpCircle className="h-3 w-3" />{formatCurrency(entry.debit, currency)}
                            </span>
                          : <span className="text-gray-300 dark:text-gray-700">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {entry.credit > 0
                          ? <span className="text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                              <ArrowDownCircle className="h-3 w-3" />{formatCurrency(entry.credit, currency)}
                            </span>
                          : <span className="text-gray-300 dark:text-gray-700">—</span>}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-bold ${entry.balanceAfter > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatCurrency(entry.balanceAfter, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage}
              pageSize={pageSize} onPageSizeChange={setPageSize} totalItems={entries.length} />
          )}
        </>
      )}
    </div>
  );
}
