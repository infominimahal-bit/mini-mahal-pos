import React, { useState, useEffect } from 'react';
import { LayoutGrid, TrendingUp, Store, Truck, Users, Wallet, Briefcase } from 'lucide-react';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { SkeletonLoader } from '../../shared/ui/SkeletonLoader';
import { DateRangePicker } from '../../shared/ui';

import { SalesReport } from './tabs/SalesReport';
import { ExpensesReport } from './tabs/ExpensesReport';
import { CustomersReport } from './tabs/CustomersReport';
import { FinancialReport } from './tabs/FinancialReport';
import { InventoryReport } from './tabs/InventoryReport';
import { SuppliersReport } from './tabs/SuppliersReport';
import { SalesmenReport } from './tabs/SalesmenReport';
import { ReportHeader } from './shared/ReportHeader';

import { useReportsData } from './useReportsData';
import { useParams } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export function ReportsManager() {
  const { subTab } = useParams();
  const { t } = useTranslation();

  const validReportTypes = ['sales', 'inventory', 'customers', 'expenses', 'financial', 'suppliers', 'salesmen'] as const;
  type ReportType = typeof validReportTypes[number];
  const reportTypeParam = (validReportTypes.includes(subTab as ReportType) ? subTab : 'sales') as ReportType;

  const data = useReportsData(reportTypeParam);

  const {
    dateRange, setDateRange, startDateInput, setStartDateInput, endDateInput, setEndDateInput,
    selectedSupplier, setSelectedSupplier, selectedCategory, setSelectedCategory,
    selectedCashier, setSelectedCashier, selectedSalesman, setSelectedSalesman,
    selectedSaleType, setSelectedSaleType, selectedPayment, setSelectedPayment,
    reportType, validStartDate, validEndDate, isDataLoading, filteredSales, filteredExpenses,
    salesData, categoryData, saleTypeData, topProducts, featureAnalytics, totalRevenue,
    totalTransactions, averageTransaction, totalCostOfGoods, grossProfit, totalExpenseAmount,
    netProfit, walletStats, customerData, salesmanData, expensesTrendData, expenseCategoryData,
    suppliers, categories, cashiers, salesmenList, paymentMethods, appSettings, appUsers,
    appCurrentUser
  } = data;

  const [isRendered, setIsRendered] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!appSettings) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-transparent">
        <SkeletonLoader type="list" count={6} />
      </div>
    );
  }

  if (!isRendered) {
    return (
      <div className="main-content-scroll p-1 lg:p-6 space-y-6 bg-gray-50/50 dark:bg-app min-h-full max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-10 w-64 bg-gray-200 dark:bg-white/5 rounded-xl"></div>
          <div className="flex gap-4">
            <div className="h-12 w-full bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-white/5 rounded-3xl"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-scroll p-1 lg:p-6 bg-gray-50/50 dark:bg-app space-y-4 lg:space-y-6 max-w-[1400px] mx-auto">
      
      <ReportHeader
        validStartDate={validStartDate}
        validEndDate={validEndDate}
        appSettings={appSettings}
        isDataLoading={isDataLoading}
        appCurrentUser={appCurrentUser}
        reportType={reportType}
      />

      <div className="relative z-30 bg-white/50 dark:bg-black/20 p-2 lg:p-3 rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
        <div className="flex flex-col xl:flex-row gap-4">
          <DateRangePicker
            preset={dateRange}
            presets={[
              { id: 'today', label: "TODAY" },
              { id: 'yesterday', label: "YESTERDAY" },
              { id: 'last7', label: "LAST 7 DAYS" },
              { id: 'thisMonth', label: "THIS MONTH" },
              { id: 'lastMonth', label: "PREVIOUS MONTH" },
              { id: 'custom', label: "CUSTOM RANGE" },
              { id: 'all', label: "ALL TIME" }
            ]}
            onPresetChange={setDateRange}
            startDate={startDateInput}
            endDate={endDateInput}
            onStartDateChange={setStartDateInput}
            onEndDateChange={setEndDateInput}
            label={"RANGE"}
            icon={TrendingUp}
          />

          <div className="hidden xl:block h-8 w-px bg-gray-200 dark:bg-white/10" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:items-center gap-1.5 lg:gap-2">
            {reportType !== 'customers' && (
              <>
                <SearchableSelect
                  label={"SUPPLIER"}
                  options={[{ id: 'All', label: "ALL" }, ...suppliers.filter(s => s !== 'All').map(s => ({ id: s, label: s }))]}
                  value={selectedSupplier}
                  onChange={setSelectedSupplier}
                  icon={Truck}
                />
                <SearchableSelect
                  label={"CATEGORY"}
                  options={[{ id: 'All', label: "ALL" }, ...categories.filter(c => c !== 'All').map(c => ({ id: c, label: c }))]}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  icon={LayoutGrid}
                />
                <SearchableSelect
                  label={"CASHIER"}
                  options={[{ id: 'All', label: "ALL" }, ...cashiers.filter(c => c !== 'All').map(c => ({ id: c, label: c }))]}
                  value={selectedCashier}
                  onChange={setSelectedCashier}
                  icon={Users}
                />
                <SearchableSelect
                  label={"SALESMAN"}
                  options={[{ id: 'All', label: "ALL" }, ...salesmenList.filter(s => s !== 'All').map(s => ({ id: s, label: s }))]}
                  value={selectedSalesman}
                  onChange={setSelectedSalesman}
                  icon={Briefcase}
                />
                <SearchableSelect
                  label={"PAYMENT"}
                  options={[{ id: 'All', label: "ALL" }, ...paymentMethods.filter(m => m !== 'All').map(m => ({ id: m, label: t(m, m).toUpperCase() }))]}
                  value={selectedPayment}
                  onChange={setSelectedPayment}
                  icon={Wallet}
                  align="right"
                />
                <SearchableSelect
                  label={"STORE"}
                  options={[
                    { id: 'all', label: "ALL" },
                    { id: 'retail', label: "RETAIL", enabled: appSettings.retailEnabled },
                    { id: 'wholesale', label: "WHOLESALE", enabled: appSettings.wholesaleEnabled }
                  ].filter(o => o.id === 'all' || o.enabled)}
                  value={selectedSaleType}
                  onChange={setSelectedSaleType}
                  icon={Store}
                  align="right"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {reportType === 'sales' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <SalesReport
            filteredSales={filteredSales}
            salesData={salesData}
            categoryData={categoryData}
            saleTypeData={saleTypeData}
            topProducts={topProducts}
            featureAnalytics={featureAnalytics}
            totalRevenue={totalRevenue}
            totalTransactions={totalTransactions}
            averageTransaction={averageTransaction}
            totalCostOfGoods={totalCostOfGoods}
            grossProfit={grossProfit}
            totalExpenseAmount={totalExpenseAmount}
            netProfit={netProfit}
            walletStats={walletStats}
            currency={appSettings.currency}
            theme={appSettings.theme}
            country={appSettings.country}
            users={appUsers}
            retailEnabled={appSettings.retailEnabled ?? true}
            wholesaleEnabled={appSettings.wholesaleEnabled}
          />
        </div>
      )}

      {reportType === 'customers' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <CustomersReport
            customerData={customerData}
            currency={appSettings.currency}
            theme={appSettings.theme}
            country={appSettings.country}
          />
        </div>
      )}

      {reportType === 'salesmen' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <SalesmenReport
            salesmanData={salesmanData}
            currency={appSettings.currency}
            theme={appSettings.theme}
          />
        </div>
      )}

      {reportType === 'expenses' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <ExpensesReport
            filteredExpenses={filteredExpenses}
            expensesTrendData={expensesTrendData}
            expenseCategoryData={expenseCategoryData}
            totalExpenseAmount={totalExpenseAmount}
            currency={appSettings.currency}
            theme={appSettings.theme}
            country={appSettings.country}
          />
        </div>
      )}

      {reportType === 'financial' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <FinancialReport
            totalRevenue={totalRevenue}
            totalTransactions={totalTransactions}
            totalCostOfGoods={totalCostOfGoods}
            grossProfit={grossProfit}
            totalExpenseAmount={totalExpenseAmount}
            filteredExpensesCount={filteredExpenses.length}
            netProfit={netProfit}
            walletStats={walletStats}
            currency={appSettings.currency}
          />
        </div>
      )}

      {reportType === 'inventory' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <InventoryReport
            startDate={validStartDate}
            endDate={validEndDate}
            globalSupplier={selectedSupplier}
            globalCategory={selectedCategory}
            globalStore={selectedSaleType}
            sales={filteredSales}
          />
        </div>
      )}

      {reportType === 'suppliers' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <SuppliersReport
            currency={appSettings.currency}
            country={appSettings.country}
          />
        </div>
      )}
    </div>
  );
}