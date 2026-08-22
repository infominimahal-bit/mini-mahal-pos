import { useCustomersStore, useExpensesStore, usePaymentsStore, useSalesStore, useSettingsStore, useUiStore, useUsersStore } from '../../stores';
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, History } from 'lucide-react';
import { useApp } from '../../context/SupabaseAppContext';
import { useAuth } from '../../context/AuthContext';
import { getTimezone } from '../../lib/dateUtils';
import { getCurrencySymbol } from '../../lib/currencies';
import { Sale } from '../../types';
import { ReceiptPrint } from '../pos/ReceiptPrint';
import { normalizePaymentMethod } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { TransactionDetailModal } from './TransactionDetailModal';
import { ExportButton } from '../../shared/export';
import { Button } from '../../shared/ui';
import { TransactionTable, computeWalletTotals, buildExportColumns, buildExportRows } from './TransactionTable';
import { TransactionFilters } from './TransactionFilters';
import { TransactionHeaderCards } from './TransactionHeaderCards';
import { isDraftSale, computeDateRange } from './TransactionsManager.utils';
import { useCloudSearch } from './TransactionsManager.cloudSearch';

export function TransactionsManager() {
  const navigate = useNavigate();
  const appSettings = useSettingsStore(s => s.settings);
  const appSales = useSalesStore(s => s.sales);
  const appPendingReturnSaleId = useUiStore(s => s.pendingReturnSaleId);
  const appPendingSearch = useUiStore(s => s.pendingSearch);
  const appUsers = useUsersStore(s => s.users);
  const appExpenses = useExpensesStore(s => s.expenses);
  const appPayments = usePaymentsStore(s => s.payments);
  const appCustomers = useCustomersStore(s => s.customers);
  const { loadMoreSales } = useApp();
  const { profile } = useAuth();
  const isAdmin = true;
  const timezone = getTimezone(appSettings.country);
  const { retailEnabled, wholesaleEnabled } = appSettings;
  const showRetail = retailEnabled !== false;
  const showWholesale = !!wholesaleEnabled;
  const activeCardsCount = 2 + (showRetail ? 1 : 0) + (showWholesale ? 1 : 0);

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [saleTypeFilter, setSaleTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sales' | 'refunds'>('all');
  const [selectedCashier, setSelectedCashier] = useState('all');
  const [selectedSalesman, setSelectedSalesman] = useState('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Refresh triggered from other actions (e.g. cloud search) handles loading
  }, [loadMoreSales]);

  const { isSearchingRemote, cloudResults, isCloudSearch } = useCloudSearch({
    searchTerm,
    paymentFilter,
    saleTypeFilter,
    selectedCashier,
    selectedSalesman,
    dateFilter,
    startDateInput,
    endDateInput,
    timezone,
    refreshKey,
    loadMoreSales,
  });

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadMoreSales(appSales.length, 100);
    setIsLoadingMore(false);
  };

  const [selectedTransaction, setSelectedTransaction] = useState<Sale | null>(null);
  const [reprintSale, setReprintSale] = useState<Sale | null>(null);

  React.useEffect(() => {
    if (appPendingReturnSaleId) {
      const saleToOpen = appSales.find(s => s.id === appPendingReturnSaleId);
      if (saleToOpen) {
        setSelectedTransaction(saleToOpen);
      }
      useUiStore.getState().setPendingReturnSaleId(null);
    }
  }, [appPendingReturnSaleId, appSales]);

  const [currentPage, setCurrentPage] = useState(1);
  const [ITEMS_PER_PAGE, setPageSize] = useState(15);

  React.useEffect(() => {
    if (appPendingSearch) {
      setSearchTerm(appPendingSearch);
      setCurrentPage(1);
      useUiStore.getState().setPendingSearch(null);
    }
  }, [appPendingSearch]);

  const { startTs, endTs } = useMemo(() => computeDateRange(dateFilter, startDateInput, endDateInput, timezone), [dateFilter, startDateInput, endDateInput, timezone]);

  const dateFiltered = useMemo(() => {
    return appSales.filter(sale => {
      if (isDraftSale(sale)) return false;
      const saleTs = new Date(sale.timestamp).getTime();
      return saleTs >= startTs && saleTs <= endTs;
    });
  }, [appSales, startTs, endTs]);

  const filteredTransactions = useMemo(() => {
    const list = isCloudSearch ? (cloudResults.length > 0 ? cloudResults : dateFiltered) : dateFiltered;
    return list.filter(sale => {
      if (isDraftSale(sale)) return false;
      if (sale.status === 'pending') return false;
      if (sale.status === 'deleted') return false;
      const inv = sale.invoiceNumber ? String(sale.invoiceNumber).trim() : '';
      const rec = sale.receiptNumber ? String(sale.receiptNumber).trim() : '';
      if ((!inv || inv === 'undefined') && (!rec || rec === 'undefined')) return false;
      const matchesSearch = isCloudSearch || (
        (sale.receiptNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.invoiceNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.customerName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.cashier ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesPayment = paymentFilter === 'all' ||
        sale.paymentMethod === paymentFilter ||
        (sale.paymentMethod === 'split' && (sale.splitPayments || []).some((sp: any) => sp.method === paymentFilter || normalizePaymentMethod(sp.method) === paymentFilter));
      const matchesSaleType = saleTypeFilter === 'all' || sale.saleType === saleTypeFilter || (!sale.saleType && saleTypeFilter === 'retail');
      const matchesCashier = selectedCashier === 'all' || sale.cashier === selectedCashier;
      const matchesSalesman = selectedSalesman === 'all' || sale.salesmanName === selectedSalesman;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'sales'
          ? (sale.status !== 'refunded' && sale.status !== 'partially_refunded')
          : (sale.status === 'refunded' || sale.status === 'partially_refunded'));
      return matchesSearch && matchesPayment && matchesSaleType && matchesCashier && matchesSalesman && matchesStatus;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [isCloudSearch, cloudResults, dateFiltered, searchTerm, paymentFilter, saleTypeFilter, selectedCashier, selectedSalesman, statusFilter]);

  const totalRevenue = filteredTransactions.reduce((s, x) => s + (x.total - (x.refundedAmount || 0)), 0);
  const totalItemsSold = filteredTransactions.reduce((s, x) => s + (x.items || []).reduce((i, item) => i + item.quantity, 0), 0);
  const retailSalesTotal = useMemo(() => {
    return filteredTransactions
      .filter(t => t.saleType === 'retail' || !t.saleType)
      .reduce((sum, t) => sum + (t.total - (t.refundedAmount || 0)), 0);
  }, [filteredTransactions]);
  const wholesaleSalesTotal = useMemo(() => {
    return filteredTransactions
      .filter(t => t.saleType === 'wholesale')
      .reduce((sum, t) => sum + (t.total - (t.refundedAmount || 0)), 0);
  }, [filteredTransactions]);
  const walletTotals = computeWalletTotals(filteredTransactions, appExpenses, appPayments, startTs, endTs);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const canEditSale = isAdmin || profile?.canEditSale;
  const canDeleteSale = isAdmin || profile?.canDeleteSale;

  const exportColumns = useMemo(() => buildExportColumns(isAdmin), [isAdmin]);
  const exportRows = useMemo(() => buildExportRows(filteredTransactions, appCustomers, appUsers, isAdmin, appSettings.country, appSettings.timezone), [filteredTransactions, appCustomers, appUsers, isAdmin, appSettings.country, appSettings.timezone]);

  return (
    <div className="main-content-scroll p-4 md:p-6 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4 shrink-0">
          <Button
            variant="ghost"
            onClick={() => navigate('/pos')}
            className="!min-h-0 !p-2 !rounded-xl !text-gray-600 dark:!text-gray-400 hover:!bg-gray-100 dark:hover:!bg-white/5 !gap-1 mr-1"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{"Back"}</span>
          </Button>
          <div className="h-10 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block" />
          <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner border border-primary/10">
            <History className="h-7 w-7 text-primary" />
          </div>
          <div className="shrink-0 flex flex-col">
            <h1 className="text-2xl xl:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{"Sales"}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">
              {isSearchingRemote ? "Searching all records..." : isCloudSearch ? `Showing ${cloudResults.length} results` : `Management Hub • ${filteredTransactions.length} Records`}
            </p>
          </div>
        </div>
        <ExportButton
          data={exportRows}
          columns={exportColumns}
          title="Sales Detailed Report"
          filtersSummary={`${appSettings.currency} • ${filteredTransactions.length} records`}
          currencySymbol={getCurrencySymbol(appSettings.currency)}
          className="!px-8 !shadow-emerald-500/20"
        />
      </div>

      <TransactionHeaderCards
        totalRevenue={totalRevenue}
        retailSalesTotal={retailSalesTotal}
        wholesaleSalesTotal={wholesaleSalesTotal}
        totalItemsSold={totalItemsSold}
        walletTotals={walletTotals}
        appSettings={appSettings}
        showRetail={showRetail}
        showWholesale={showWholesale}
        activeCardsCount={activeCardsCount}
      />

      <TransactionFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        saleTypeFilter={saleTypeFilter}
        setSaleTypeFilter={setSaleTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        selectedCashier={selectedCashier}
        setSelectedCashier={setSelectedCashier}
        selectedSalesman={selectedSalesman}
        setSelectedSalesman={setSelectedSalesman}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        startDateInput={startDateInput}
        setStartDateInput={setStartDateInput}
        endDateInput={endDateInput}
        setEndDateInput={setEndDateInput}
        setCurrentPage={setCurrentPage}
      />

      <TransactionTable
        transactions={paginatedTransactions}
        filteredCount={filteredTransactions.length}
        isSearchingRemote={isSearchingRemote}
        currency={appSettings.currency}
        country={appSettings.country}
        canEditSale={!!canEditSale}
        canDeleteSale={!!canDeleteSale}
        onView={setSelectedTransaction}
        onReprint={setReprintSale}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={ITEMS_PER_PAGE}
        onPageSizeChange={setPageSize}
      />

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          allTransactions={filteredTransactions}
          onNavigate={setSelectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onReprint={sale => setReprintSale(sale)}
        />
      )}
      {reprintSale && <ReceiptPrint sale={reprintSale} onClose={() => setReprintSale(null)} />}
    </div>
  );
}
