import React, { Fragment } from 'react';
import { Building2, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { formatAppDate } from '../../../lib/dateUtils';
import { SharedSearchBar } from '../../../shared/modules/search-and-list';
import { Button } from '../../../shared/ui';
import { ExportButton } from '../../../shared/export';
import { useSuppliersReportData } from './SuppliersReport.data';
import { getSourceBadge } from './SuppliersReport.utils';

interface SuppliersReportProps {
  currency: string;
  country: string;
}

export function SuppliersReport({ currency, country }: SuppliersReportProps) {
  const {
    loading,
    expandedId,
    expandedLedger,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortDesc,
    setSortDesc,
    filteredRows,
    exportRows,
    totals,
    handleExpand,
  } = useSuppliersReportData();

  const exportColumns = [
    { key: 'name', label: "Supplier" },
    { key: 'phone', label: "Phone" },
    { key: 'totalBilled', label: "Billed", format: 'currency' as const },
    { key: 'totalPaid', label: "Paid", format: 'currency' as const },
    { key: 'balance', label: "Balance", format: 'currency' as const },
    { key: 'transactionCount', label: "Transactions", format: 'number' as const },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200/50 dark:bg-white/[0.03] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="stat-card bg-gradient-to-br from-blue-500 to-indigo-700 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Total Billed"}</span>
            <span className="stat-card-value">{formatCurrency(totals.billed, currency)}</span>
            <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">{totals.count} {"suppliers"}</p>
          </div>
          <Building2 className="stat-card-icon" />
        </div>
        <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-700 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Total Paid"}</span>
            <span className="stat-card-value">{formatCurrency(totals.paid, currency)}</span>
          </div>
          <Wallet className="stat-card-icon" />
        </div>
        <div className="stat-card bg-gradient-to-br from-rose-500 to-red-700 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Outstanding"}</span>
            <span className="stat-card-value">{formatCurrency(totals.outstanding, currency)}</span>
          </div>
          <TrendingDown className="stat-card-icon" />
        </div>
        <div className="stat-card bg-gradient-to-br from-violet-500 to-purple-700 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Suppliers"}</span>
            <span className="stat-card-value">{totals.count}</span>
          </div>
          <TrendingUp className="stat-card-icon" />
        </div>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <SharedSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={"Search suppliers..."}
          />
        </div>
        <ExportButton
          data={exportRows}
          columns={exportColumns}
          title={"Supplier Report"}
          filtersSummary={searchTerm ? `${"Search"}: ${searchTerm}` : undefined}
          currencySymbol={getCurrencySymbol(currency)}
          className="!min-h-0 !px-5 !py-3 !rounded-xl !text-[10px] !font-black !bg-gray-100 dark:!bg-white/5 !text-gray-600 dark:!text-gray-400 !border-gray-200 dark:!border-white/5 hover:!text-primary"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#080808] rounded-[2rem] border border-gray-200 dark:border-white/5 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5">
                {[
                  { key: 'name' as const, label: "Supplier" },
                  { key: 'billed' as const, label: "Billed" },
                  { key: 'paid' as const, label: "Paid" },
                  { key: 'balance' as const, label: "Balance" },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => { setSortBy(col.key); setSortDesc(sortBy === col.key ? !sortDesc : true); }}
                    className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] cursor-pointer hover:text-primary transition-colors select-none"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (sortDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                    </span>
                  </th>
                ))}
                <th className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] text-center">{"Details"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm font-bold">{"No suppliers found"}</td>
                </tr>
              ) : (
                filteredRows.map(row => (
                  <Fragment key={row.supplier.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">{row.supplier.name}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">{row.supplier.phone || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[12px] font-black text-red-500 tabular-nums">{formatCurrency(row.totalBilled, currency)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[12px] font-black text-emerald-500 tabular-nums">{formatCurrency(row.totalPaid, currency)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[12px] font-black tabular-nums ${row.balance > 0 ? 'text-rose-500' : 'text-primary'}`}>
                          {formatCurrency(row.balance, currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleExpand(row.supplier.id)}
                          icon={expandedId === row.supplier.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          className="!min-h-0 !px-3 !py-1.5 !rounded-lg !text-[9px] !font-black !bg-gray-100 dark:!bg-white/5 !text-gray-600 hover:!text-primary !hover:bg-gray-100 dark:!hover:bg-white/5"
                        />
                      </td>
                    </tr>
                    {expandedId === row.supplier.id && (
                      <tr key={`${row.supplier.id}-detail`}>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.01]">
                          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {expandedLedger.length === 0 ? (
                              <p className="text-center text-gray-500 text-[10px] font-bold py-4">{"No transactions"}</p>
                            ) : (
                              expandedLedger.map((tx: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                                  <div className="flex items-center gap-3">
                                    {getSourceBadge(tx.sourceType)}
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-900 dark:text-white">{tx.detail}</p>
                                      <p className="text-[9px] text-gray-500">{formatAppDate(tx.date, country)}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {tx.credit > 0 && <p className="text-[11px] font-black text-red-500">+{formatCurrency(tx.credit, currency)}</p>}
                                    {tx.debit > 0 && <p className="text-[11px] font-black text-emerald-500">-{formatCurrency(tx.debit, currency)}</p>}
                                    {tx.isManualOverride && <span className="text-[8px] font-black text-amber-500 uppercase">Override</span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
          {filteredRows.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm font-bold">{"No suppliers found"}</div>
          ) : (
            filteredRows.map(row => (
              <div key={row.supplier.id} className="p-4">
                <button onClick={() => handleExpand(row.supplier.id)} className="w-full text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">{row.supplier.name}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{row.supplier.phone || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black tabular-nums ${row.balance > 0 ? 'text-rose-500' : 'text-primary'}`}>
                        {formatCurrency(row.balance, currency)}
                      </p>
                      <p className="text-[8px] text-gray-500 uppercase tracking-widest">{"Balance"}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[9px] text-red-400 font-bold">{"Billed"}: {formatCurrency(row.totalBilled, currency)}</span>
                    <span className="text-[9px] text-emerald-400 font-bold">{"Paid"}: {formatCurrency(row.totalPaid, currency)}</span>
                  </div>
                </button>
                {expandedId === row.supplier.id && (
                  <div className="mt-3 space-y-2">
                    {expandedLedger.map((tx: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl">
                        <div className="flex items-center gap-2">
                          {getSourceBadge(tx.sourceType)}
                          <span className="text-[9px] text-gray-700 dark:text-gray-300 font-bold truncate max-w-[120px]">{tx.detail}</span>
                        </div>
                        <span className={`text-[10px] font-black tabular-nums ${tx.credit > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {tx.credit > 0 ? `+${formatCurrency(tx.credit, currency)}` : `-${formatCurrency(tx.debit, currency)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
