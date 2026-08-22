import React from 'react';
import { Clock, Package, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { formatAppDate } from '../../lib/dateUtils';
import { useSettingsStore } from '../../stores';
import { Pagination } from '../../shared/ui';
import { StatusBadge } from './inventoryReportTable.statusBadge';
import type { InventoryReportTableProps } from './inventoryReportTable.types';

export function InventoryReportMobileTable({
  data,
  allData,
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
  const totalGrossProfit = allData.reduce((s, p) => s + p.grossProfit, 0);

  return (
    <div className="lg:hidden space-y-4">
      {data.map(item => (
        <div key={item.id} onClick={() => onToggleRow(item.id)} className="bg-white dark:bg-zinc-900/60 p-4 rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white leading-tight">{item.name}</h4>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{item.sku} • {item.category}</p>
              </div>
            </div>
            <StatusBadge status={item.stockStatus} />
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-200 dark:border-white/5">
            <div>
              <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">{"Stock Position"}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-gray-900 dark:text-white">{item.isInfinite ? '∞' : item.stock}</span>
                {!item.isInfinite && <span className="text-[10px] text-gray-600">/ {"min"} {item.minStock}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-[8px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-0.5">{"Value (Cost)"}</p>
                <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(item.stockValue, appSettings.currency)}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-0.5">{"Value (Sale)"}</p>
                <p className="text-sm font-black text-primary dark:text-emerald-400">{formatCurrency(item.potentialRevenue, appSettings.currency)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-2xl">
              <p className="text-[8px] font-black text-gray-600 uppercase mb-0.5">{"Sold"}</p>
              <p className="text-xs font-black text-gray-900 dark:text-white">{item.soldQty.toFixed(1)}</p>
            </div>
            <div className="bg-primary/5 dark:bg-primary/10 p-2 rounded-2xl">
              <p className="text-[8px] font-black text-primary uppercase mb-0.5">{"Revenue"}</p>
              <p className="text-xs font-black text-primary dark:text-emerald-400">{formatCurrency(item.revenue, appSettings.currency)}</p>
            </div>
            <div className="bg-blue-500/5 dark:bg-blue-500/10 p-2 rounded-2xl">
              <p className="text-[8px] font-black text-blue-500 uppercase mb-0.5">{"Profit"}</p>
              <p className="text-xs font-black text-blue-600 dark:text-blue-400">{formatCurrency(item.grossProfit, appSettings.currency)}</p>
            </div>
          </div>

          {expandedRows.has(item.id) && item.recentSales && item.recentSales.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-white/10 space-y-4">
              {item.recentSales && item.recentSales.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                    <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">{"Sales Ledger"}</p>
                  </div>
                  {item.recentSales.map((sale: any, sIdx: number) => (
                    <div key={sIdx} className="bg-gray-50 dark:bg-black/20 p-3 rounded-xl space-y-1 text-[10px]">
                      <div className="flex justify-between items-center mb-1 border-b border-gray-200 dark:border-white/5 pb-1">
                        <span className="font-bold text-gray-600">{formatAppDate(new Date(sale.timestamp))}</span>
                        <span className="font-black text-primary dark:text-emerald-400">{formatCurrency(sale.revenue, appSettings.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-500">INV #{sale.invoiceNumber}</span>
                        <span className="font-black text-gray-900 dark:text-white">{"Qty"}: {sale.quantity}</span>
                      </div>
                      {(sale.selectedVariant || sale.serialNumber || (sale.selectedModifiers && sale.selectedModifiers.length > 0) || (sale.addonItems && sale.addonItems.length > 0) || (sale.toppings && sale.toppings.length > 0)) && (
                        <div className="text-[9px] font-bold text-gray-500 pt-1 flex flex-col gap-0.5 normal-case tracking-normal">
                          {sale.selectedVariant && <span>{sale.selectedVariant}</span>}
                          {sale.serialNumber && <span className="text-amber-500">SN: {sale.serialNumber}</span>}
                          {sale.selectedModifiers?.length > 0 && <span className="text-primary">+ {sale.selectedModifiers.map((m: any) => `${m.name} (${formatCurrency(m.price, appSettings.currency)})`).join(', ')}</span>}
                          {sale.addonItems?.length > 0 && <span className="text-violet-500">+ Add-ons: {sale.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity}x (${formatCurrency(a.subtotal, appSettings.currency)})`).join(', ')}</span>}
                          {sale.toppings?.length > 0 && <span className="text-gray-500">+ {sale.toppings.map((t: any) => `${t.name} (${formatCurrency(t.price, appSettings.currency)})`).join(', ')}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="bg-gray-900 text-white p-5 rounded-3xl shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-4">{"Inventory Grand Summary"}</p>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <p className="text-[8px] font-bold text-emerald-400 uppercase mb-1">{"Total Stock"}</p>
            <p className="text-lg font-black">{allData.reduce((s, p) => s + (p.isInfinite ? 0 : p.stock), 0)}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-emerald-400 uppercase mb-1">{"Stock (Cost)"}</p>
            <p className="text-lg font-black">{formatCurrency(totalStockValue, appSettings.currency)}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-emerald-400 uppercase mb-1">{"Stock (Sale)"}</p>
            <p className="text-lg font-black">{formatCurrency(totalPotentialRevenue, appSettings.currency)}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-blue-400 uppercase mb-1">{"Total Profit"}</p>
            <p className="text-lg font-black text-blue-400">{formatCurrency(totalGrossProfit, appSettings.currency)}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
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
    </div>
  );
}
