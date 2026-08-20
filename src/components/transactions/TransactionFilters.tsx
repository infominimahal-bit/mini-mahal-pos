import React from 'react';
import { LayoutGrid, User, Briefcase, Store, Package } from 'lucide-react';
import { useUsersStore, useSalesStore, useSettingsStore } from '../../stores';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { SegmentedControl, DateRangePicker } from '../../shared/ui';
import { SharedSearchBar } from '../../shared/modules/search-and-list';

interface TransactionFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  saleTypeFilter: 'all' | 'retail' | 'wholesale';
  setSaleTypeFilter: (v: 'all' | 'retail' | 'wholesale') => void;
  statusFilter: 'all' | 'sales' | 'refunds';
  setStatusFilter: (v: 'all' | 'sales' | 'refunds') => void;
  paymentFilter: string;
  setPaymentFilter: (v: string) => void;
  selectedCashier: string;
  setSelectedCashier: (v: string) => void;
  selectedSalesman: string;
  setSelectedSalesman: (v: string) => void;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  startDateInput: string;
  setStartDateInput: (v: string) => void;
  endDateInput: string;
  setEndDateInput: (v: string) => void;
  setCurrentPage: (v: number) => void;
}

export function TransactionFilters({
  searchTerm,
  setSearchTerm,
  saleTypeFilter,
  setSaleTypeFilter,
  statusFilter,
  setStatusFilter,
  paymentFilter,
  setPaymentFilter,
  selectedCashier,
  setSelectedCashier,
  selectedSalesman,
  setSelectedSalesman,
  dateFilter,
  setDateFilter,
  startDateInput,
  setStartDateInput,
  endDateInput,
  setEndDateInput,
  setCurrentPage,
}: TransactionFiltersProps) {
  const appUsers = useUsersStore(s => s.users);
  const appSalesmen = useUsersStore(s => s.salesmen);
  const appSales = useSalesStore(s => s.sales);
  const appSettings = useSettingsStore(s => s.settings);

  const cashiersList = React.useMemo(() => {
    const userNames = appUsers.map(u => u.name).filter(c => c && c.toUpperCase() !== 'UNKNOWN');
    const saleCashiers = appSales.map(s => s.cashier).filter(c => c && c.toUpperCase() !== 'UNKNOWN');
    return ['all', ...Array.from(new Set([...userNames, ...saleCashiers]))];
  }, [appSales, appUsers]);

  const salesmenList = React.useMemo(() => {
    const activeNames = appSalesmen?.map(s => s.name).filter(Boolean) || [];
    const userNames = appUsers.map(u => u.name).filter(Boolean);
    const saleSalesmen = appSales.map(s => s.salesmanName).filter(Boolean);
    return ['all', ...Array.from(new Set([...activeNames, ...userNames, ...saleSalesmen]))];
  }, [appSales, appSalesmen, appUsers]);

  const saleTypeToggles = [
    { key: 'all', label: "All Sales", icon: <LayoutGrid className="h-4 w-4" /> },
    { key: 'retail', label: "Retail", icon: <Store className="h-4 w-4" />, enabled: appSettings.retailEnabled },
    { key: 'wholesale', label: "Wholesale", icon: <Package className="h-4 w-4" />, enabled: appSettings.wholesaleEnabled },
  ].filter((tt: any) => tt.key === 'all' || tt.enabled);

  return (
    <div className="bg-white/50 dark:bg-black/20 p-3 lg:p-4 rounded-[1.75rem] border border-gray-200/50 dark:border-white/5 shadow-xl">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <div title={"Searches all-time records in cloud, ignoring date filters"}>
          <SharedSearchBar
            value={searchTerm}
            onChange={val => { setSearchTerm(val); setCurrentPage(1); }}
            placeholder={"Search sales..."}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="grid grid-cols-2 lg:flex items-center gap-2 w-full lg:w-auto">
            <SearchableSelect
              label={"SALE TYPE"}
              options={saleTypeToggles.map(tt => ({ id: tt.key, label: tt.label }))}
              value={saleTypeFilter}
              onChange={(val: any) => { setSaleTypeFilter(val); setCurrentPage(1); }}
              icon={LayoutGrid}
            />
            <SegmentedControl
              options={[
                { label: "All", value: 'all' },
                { label: "Sales", value: 'sales' },
                { label: "Refunds", value: 'refunds' }
              ]}
              value={statusFilter}
              onChange={(val: string) => { setStatusFilter(val as any); setCurrentPage(1); }}
              className="lg:w-[280px]"
            />
          </div>
          <div className="grid grid-cols-2 lg:flex items-center gap-2 w-full lg:w-auto">
            <SearchableSelect
              options={[
                { id: 'all', label: "Payment: All" },
                { id: 'cash', label: "Cash" },
                { id: 'card', label: "Card" },
                { id: 'online', label: "Online Wallet" }
              ]}
              value={paymentFilter}
              onChange={val => { setPaymentFilter(val); setCurrentPage(1); }}
              placeholder={"Payment"}
            />
            <SearchableSelect
              options={cashiersList.map(c => ({ id: c, label: c === 'all' ? "Cashier: All" : c.toUpperCase() }))}
              value={selectedCashier}
              onChange={val => { setSelectedCashier(val); setCurrentPage(1); }}
              placeholder={"Cashier"}
              icon={User}
              align="right"
            />
            <SearchableSelect
              options={salesmenList.map(s => ({ id: s, label: s === 'all' ? "Salesman: All" : s.toUpperCase() }))}
              value={selectedSalesman}
              onChange={val => { setSelectedSalesman(val); setCurrentPage(1); }}
              placeholder={"Salesman"}
              icon={Briefcase}
              align="right"
            />
            <DateRangePicker
              preset={dateFilter}
              presets={[
                { id: 'today', label: "TODAY" },
                { id: 'yesterday', label: "YESTERDAY" },
                { id: 'last7', label: "LAST 7 DAYS" },
                { id: 'thisMonth', label: "THIS MONTH" },
                { id: 'lastMonth', label: "PREVIOUS MONTH" },
                { id: 'custom', label: "CUSTOM RANGE" },
                { id: 'all', label: "ALL TIME" }
              ]}
              onPresetChange={val => { setDateFilter(val); setCurrentPage(1); }}
              startDate={startDateInput}
              endDate={endDateInput}
              onStartDateChange={(v) => { setStartDateInput(v); setCurrentPage(1); }}
              onEndDateChange={(v) => { setEndDateInput(v); setCurrentPage(1); }}
            />

          </div>
        </div>
      </div>
    </div>
  );
}
