import React from 'react';
import {
  TrendingUp, TrendingDown,
  ArrowUpDown, ChevronRight, ChevronDown, Database, Clock, Package
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { formatAppDate } from '../../lib/dateUtils';
import { useSettingsStore } from '../../stores';
import { Badge, Pagination } from '../../shared/ui';
import { StatusBadge } from './inventoryReportTable.statusBadge';
import type { InventoryReportTableProps } from './inventoryReportTable.types';

export function InventoryReportDesktopTable({
  data,
  allData,
  sortField,
  sortDir,
  onToggleSort,
  expandedRows,
  onToggleRow,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange
}: InventoryReportTableProps) {
  const appSettings = useSettingsStore(s => s.settings);

  const totalStockValue = allData.reduce((s, p) => s + p.stockValue, 0);
  const totalPotentialRevenue = allData.reduce((s, p) => s + p.potentialRevenue, 0);
  const totalActualRevenue = allData.reduce((s, p) => s + p.revenue, 0);
  const totalCOGS = allData.reduce((s, p) => s + p.cogs, 0);
  const totalGrossProfit = allData.reduce((s, p) => s + p.grossProfit, 0);

  const SortTh = ({ field, label }: { field: any; label: string }) => (
    <th onClick={() => onToggleSort(field)} className="px-3 py-3 text-[9px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors">
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && <ArrowUpDown className="w-3 h-3 text-primary" />}
      </div>
    </th>
  );

  return (
    <>
      <div className="hidden lg:block bg-white dark:bg-zinc-900/60 rounded-3xl border border-gray-200/50 dark:border-white/5 overflow-hidden shadow-xl shadow-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5">
                <SortTh field="name" label={"Product Details"} />
                <SortTh field="stock" label={"Stock"} />
                <SortTh field="status" label={"Status"} />
                <th className="px-3 py-3 text-[9px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest">{"Stock Value (Cost/Sale)"}</th>
                <SortTh field="soldQty" label={"Sold Qty"} />
                <SortTh field="revenue" label={"Revenue"} />
                <SortTh field="cogs" label={"COGS (Cost)"} />
                <SortTh field="grossProfit" label={"Profit"} />
                <SortTh field="profitMargin" label={"Margin"} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {data.map(item => (
                <React.Fragment key={item.id}>
                  <tr onClick={() => onToggleRow(item.id)} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-lg transition-all ${expandedRows.has(item.id) ? 'bg-primary text-white' : 'text-gray-600 group-hover:text-primary'}`}>
                          {item.batches && item.batches.length > 0 ? (expandedRows.has(item.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <Database className="w-3.5 h-3.5 opacity-20" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">{item.name}</p>
                          <p className="text-[9px] font-bold text-gray-600 mt-1 uppercase tracking-tighter">{item.sku} • {item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-xs font-black text-gray-900 dark:text-white">{item.isInfinite ? '∞' : item.stock}</p>
                      <p className="text-[8px] font-bold text-gray-600 opacity-50 uppercase">{item.isInfinite ? "Non-Tracked" : `${"min"}: ${item.minStock}`}</p>
                    </td>
                    <td className="px-3 py-4 text-center"><StatusBadge status={item.stockStatus} /></td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col">
                        <p className="text-xs font-black text-gray-900 dark:text-white">
                          <span className="text-gray-600 mr-1 text-[10px]">C:</span>
                          {formatCurrency(item.stockValue, appSettings.currency)}
                        </p>
                        <p className="text-[11px] font-black text-primary dark:text-emerald-400 mt-0.5">
                          <span className="text-gray-600 mr-1 text-[10px]">S:</span>
                          {formatCurrency(item.potentialRevenue, appSettings.currency)}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center"><p className="text-xs font-black text-gray-900 dark:text-white">{item.soldQty > 0 ? item.soldQty.toFixed(1) : '—'}</p></td>
                    <td className="px-3 py-4"><p className="text-xs font-black text-primary dark:text-emerald-400">{item.revenue > 0 ? formatCurrency(item.revenue, appSettings.currency) : '—'}</p></td>
                    <td className="px-3 py-4"><p className="text-xs font-bold text-rose-500">{item.cogs > 0 ? formatCurrency(item.cogs, appSettings.currency) : '—'}</p></td>
                    <td className="px-3 py-4"><p className={`text-xs font-black ${item.grossProfit > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600'}`}>{item.grossProfit !== 0 ? formatCurrency(item.grossProfit, appSettings.currency) : '—'}</p></td>
                    <td className="px-3 py-4">
                      <span className={`text-[10px] font-black flex items-center gap-1 ${item.profitMargin > 30 ? 'text-primary' : 'text-gray-600'}`}>
                        {item.profitMargin > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && (item.batches.length > 0 || (item.recentSales && item.recentSales.length > 0)) && (
                    <tr className="bg-gray-50/50 dark:bg-white/[0.01]">
                      <td colSpan={9} className="px-12 py-4 space-y-6">
                        {item.batches.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">{"Batch Purchase History"}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {item.batches.map((batch: any, bIdx: number) => (
                                <div key={batch.id || bIdx} className="p-3 bg-white dark:bg-zinc-800/80 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-black text-primary uppercase">Batch #{batch.batchNumber || bIdx + 1}</span>
                                    {batch.qtyRemaining > 0
                                      ? <Badge size="sm" tone="success" className="!text-[8px] !px-1.5 !py-0.5 !rounded !bg-primary/10 !text-primary dark:!text-primary">{"Active"}</Badge>
                                      : <Badge size="sm" tone="danger" className="!text-[8px] !px-1.5 !py-0.5 !rounded !bg-rose-500/10 !text-rose-500 dark:!text-rose-500">{"Closed"}</Badge>}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]"><span className="text-gray-600 font-bold uppercase tracking-tight">{"Acquisition"}</span><span className="text-gray-900 dark:text-white font-black">{batch.manufacturingDate ? formatAppDate(new Date(batch.manufacturingDate)) : '—'}</span></div>
                                    <div className="flex justify-between text-[10px]"><span className="text-gray-600 font-bold uppercase tracking-tight">{"Pur. Price"}</span><span className="text-gray-900 dark:text-white font-black">{formatCurrency(batch.costPrice, appSettings.currency)}</span></div>
                                    <div className="flex justify-between text-[10px] pt-1 border-t border-gray-200 dark:border-white/5"><span className="text-gray-600 font-bold uppercase tracking-tight">{"Remaining"}</span><span className="text-gray-900 dark:text-white font-black">{batch.qtyRemaining} / {batch.quantity}</span></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.recentSales && item.recentSales.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                              <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">{"Sales History (Selected Period)"}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {item.recentSales.map((sale: any, sIdx: number) => (
                                <div key={sIdx} className="p-3 bg-white dark:bg-zinc-800/80 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-black text-blue-500 uppercase">INV #{sale.invoiceNumber || '—'}</span>
                                    <Badge size="sm" tone="info" className="!text-[8px] !px-1.5 !py-0.5 !rounded !bg-blue-500/10 !text-blue-500 dark:!text-blue-500">{formatAppDate(new Date(sale.timestamp))}</Badge>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]"><span className="text-gray-600 font-bold uppercase tracking-tight">{"Customer"}</span><span className="text-gray-900 dark:text-white font-black truncate max-w-[100px] text-right">{sale.customerName || "Walk-in"}</span></div>
                                    <div className="flex justify-between text-[10px]"><span className="text-gray-600 font-bold uppercase tracking-tight">{"Quantity"}</span><span className="text-gray-900 dark:text-white font-black">{sale.quantity}</span></div>
                                    <div className="flex justify-between text-[10px] pt-1 border-t border-gray-200 dark:border-white/5"><span className="text-gray-600 font-bold uppercase tracking-tight">{"Revenue"}</span><span className="text-primary dark:text-emerald-400 font-black">{formatCurrency(sale.revenue, appSettings.currency)}</span></div>
                                    {(sale.selectedVariant || sale.serialNumber || (sale.selectedModifiers && sale.selectedModifiers.length > 0) || (sale.addonItems && sale.addonItems.length > 0) || (sale.toppings && sale.toppings.length > 0)) && (
                                      <div className="pt-1 border-t border-gray-200 dark:border-white/5 text-[9px] font-bold text-gray-500 text-right flex flex-col gap-0.5 mt-0.5 normal-case tracking-normal">
                                        {sale.selectedVariant && <span>{sale.selectedVariant}</span>}
                                        {sale.serialNumber && <span className="text-amber-500">SN: {sale.serialNumber}</span>}
                                        {sale.selectedModifiers?.length > 0 && <span className="text-primary">+ {sale.selectedModifiers.map((m: any) => `${m.name} (${formatCurrency(m.price, appSettings.currency)})`).join(', ')}</span>}
                                        {sale.addonItems?.length > 0 && <span className="text-violet-500">+ Add-ons: {sale.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity}x (${formatCurrency(a.subtotal, appSettings.currency)})`).join(', ')}</span>}
                                        {sale.toppings?.length > 0 && <span className="text-gray-500">+ {sale.toppings.map((t: any) => `${t.name} (${formatCurrency(t.price, appSettings.currency)})`).join(', ')}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            {allData.length > 0 && (
              <tfoot>
                <tr className="bg-gray-900 text-white font-black">
                  <td className="px-3 py-4 text-[10px] uppercase tracking-widest opacity-50">{"Grand Totals"}</td>
                  <td className="px-3 py-4 text-xs">{allData.reduce((s, p) => s + (p.isInfinite ? 0 : p.stock), 0)}</td>
                  <td className="px-3 py-4"></td>
                  <td className="px-3 py-4 text-xs">{formatCurrency(totalStockValue, appSettings.currency)}</td>
                  <td className="px-3 py-4 text-xs text-center">{allData.reduce((s, p) => s + p.soldQty, 0).toFixed(1)}</td>
                  <td className="px-3 py-4 text-xs">{formatCurrency(totalActualRevenue, appSettings.currency)}</td>
                  <td className="px-3 py-4 text-xs text-rose-400">{formatCurrency(totalCOGS, appSettings.currency)}</td>
                  <td className="px-3 py-4 text-xs text-blue-400">{formatCurrency(totalGrossProfit, appSettings.currency)}</td>
                  <td className="px-3 py-4 text-xs">{(totalActualRevenue > 0 ? totalGrossProfit / totalActualRevenue * 100 : 0).toFixed(1)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="hidden lg:flex justify-center pt-4">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          totalItems={allData.length}
          mode="numbered"

          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </>
  );
}
