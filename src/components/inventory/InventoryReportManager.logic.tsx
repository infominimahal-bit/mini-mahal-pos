import { useInventoryStore, useProductsStore, useSalesStore, useSettingsStore } from '../../stores';
import React, { useState } from 'react';
import {
  Package, Tag, DollarSign, BarChart3, TrendingUp, TrendingDown, Calendar
} from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../lib/currencies';
import { formatAppDate } from '../../lib/dateUtils';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { usePagination } from '../../shared/ui';
import { ExportButton } from '../../shared/export';
import InventoryReportTable from './InventoryReportTable';
import { useInventoryReportData } from './useInventoryReportData';
import type { InventoryReportManagerProps, SortField, SortDir } from './inventoryReportManager.types';

export default function InventoryReportManager({
  startDate,
  endDate,
  globalSupplier = 'All',
  globalCategory = 'All',
  globalStore = 'All',
  sales
}: InventoryReportManagerProps) {
  const appProducts = useProductsStore(s => s.products);
  const appSales = useSalesStore(s => s.sales);
  const appStockHistory = useInventoryStore(s => s.stockHistory);
  const appSettings = useSettingsStore(s => s.settings);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  React.useEffect(() => {
    if (globalCategory) setCategoryFilter(globalCategory);
    if (globalSupplier) setSupplierFilter(globalSupplier);
  }, [globalCategory, globalSupplier]);

  const {
    inventoryData,
    totalStockValue,
    totalPotentialRevenue,
    totalActualRevenue,
    totalCOGS,
    totalGrossProfit,
    exportColumns,
    exportRows
  } = useInventoryReportData({
    appProducts,
    appSales,
    appStockHistory,
    appSettings,
    startDate,
    endDate,
    globalSupplier,
    globalCategory,
    globalStore,
    sales,
    search,
    statusFilter,
    categoryFilter,
    supplierFilter,
    sortField,
    sortDir
  });

  const { page, totalPages, pageItems: displayedData, goToPage, pageSize, setPageSize } = usePagination(inventoryData, 25);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-3xl mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><Calendar className="w-4 h-4 text-primary" /></div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-primary dark:text-emerald-400 leading-none mb-1">{"Period"}</p>
            <p className="text-[11px] font-black text-gray-900 dark:text-white">{formatAppDate(startDate)} — {formatAppDate(endDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><Tag className="w-4 h-4 text-primary" /></div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-primary dark:text-emerald-400 leading-none mb-1">{"Active Store"}</p>
            <p className="text-[11px] font-black text-gray-900 dark:text-white capitalize">{globalStore === 'all' ? "All Channels" : globalStore}</p>
          </div>
        </div>
        <div className="ml-auto px-4 py-2 rounded-2xl bg-white/50 dark:bg-black/20 border border-gray-200/50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-[9px] font-black text-primary uppercase tracking-widest">{"Live Analytics Active"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="stat-card bg-gradient-to-br from-blue-600 to-indigo-700">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Stock Value (Cost)"}</span>
            <span className="stat-card-value">{formatCurrency(totalStockValue, appSettings.currency)}</span>
          </div>
          <DollarSign className="stat-card-icon" />
        </div>
        <div className="stat-card bg-gradient-to-br from-indigo-500 to-violet-700">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Stock Value (Sale)"}</span>
            <span className="stat-card-value">{formatCurrency(totalPotentialRevenue, appSettings.currency)}</span>
          </div>
          <Tag className="stat-card-icon" />
        </div>
        <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-600">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Actual Revenue"}</span>
            <span className="stat-card-value">{formatCurrency(totalActualRevenue, appSettings.currency)}</span>
          </div>
          <TrendingUp className="stat-card-icon" />
        </div>
        <div className="stat-card bg-gradient-to-br from-rose-500 to-red-600">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"COGS (Stock Cost)"}</span>
            <span className="stat-card-value">{formatCurrency(totalCOGS, appSettings.currency)}</span>
          </div>
          <TrendingDown className="stat-card-icon" />
        </div>
        <div className="stat-card bg-gradient-to-br from-orange-500 to-amber-600">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Gross Profit"}</span>
            <span className="stat-card-value">{formatCurrency(totalGrossProfit, appSettings.currency)}</span>
          </div>
          <BarChart3 className="stat-card-icon" />
        </div>
        <div className="stat-card bg-gradient-to-br from-cyan-500 to-blue-500">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Total Products"}</span>
            <span className="stat-card-value">{inventoryData.length}</span>
          </div>
          <Package className="stat-card-icon" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-zinc-900/60 p-2 rounded-2xl border border-gray-200/50">
        <div className="flex-1 w-full sm:min-w-[200px]">
          <SharedSearchBar
            value={search}
            onChange={setSearch}
            placeholder={"Search name, SKU..."}
          />
        </div>
        <ExportButton
          data={exportRows}
          columns={exportColumns}
          title="Inventory Report"
          filtersSummary={`${formatAppDate(startDate)} — ${formatAppDate(endDate)}${globalStore && globalStore !== 'all' ? ` • Store: ${globalStore}` : ''}`}
          currencySymbol={getCurrencySymbol(appSettings.currency)}
          className="w-full sm:w-auto hover:scale-105"
        />
      </div>

      <InventoryReportTable
        data={displayedData}
        allData={inventoryData}
        sortField={sortField}
        sortDir={sortDir}
        onToggleSort={toggleSort}
        expandedRows={expandedRows}
        onToggleRow={toggleRow}
        page={page}
        totalPages={totalPages}
        onPageChange={goToPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
