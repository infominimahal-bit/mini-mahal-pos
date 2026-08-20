import { useCustomersStore, useSalesStore, useSettingsStore, useUsersStore } from '../../stores';
import { useState, useMemo } from 'react';
import { Plus, User, Mail, CreditCard, Users, Receipt } from 'lucide-react';
import { Customer } from '../../types';
import { can } from '../../lib/permissions';
import { CustomerModal } from './CustomerModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { sonner } from '../../lib/sonner';
import { formatCurrency } from '../../lib/currencies';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { Button } from '../../shared/ui';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { CustomerTable } from './CustomerTable';
import {
  CURRENCY_DIAL_CODE,
  computeCustomerDateRange,
  filterCustomers,
  filterSalesByDate,
  computeActiveCustomers,
  getCustomerTotalPurchases,
  computeTotalPurchases,
} from './customerManagerUtils';

export function CustomerManager() {
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSettings = useSettingsStore(s => s.settings);
  const appCustomers = useCustomersStore(s => s.customers);
  const appSales = useSalesStore(s => s.sales);
  const canManageCustomers = can(appCurrentUser?.role, 'manage_customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ITEMS_PER_PAGE, setPageSize] = useState(25);

  const { validStartDate, validEndDate } = useMemo(() =>
    computeCustomerDateRange(dateFilter, startDateInput, endDateInput, appSettings.country),
    [dateFilter, startDateInput, endDateInput, appSettings.country]);

  const filteredCustomers = useMemo(() =>
    filterCustomers(appCustomers, appSales, searchTerm, dateFilter, validStartDate, validEndDate, appSettings.country),
    [appCustomers, appSales, searchTerm, dateFilter, validStartDate, validEndDate, appSettings.country]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!canManageCustomers) { sonner.error('You do not have permission to delete customers.'); return; }
    const hasLinkedSales = appSales.some(s => s.customerId === customerId);
    let proceed = false;

    if (hasLinkedSales) {
      const result = await sonner.confirm(
        "Delete Customer?",
        "This customer has linked sales. Their sales history will remain in your records assigned to Guest. Delete the customer profile anyway?",
        "YES, DELETE PROFILE"
      );
      proceed = result.isConfirmed;
    } else {
      const result = await sonner.deleteConfirm('customer');
      proceed = result.isConfirmed;
    }

    if (!proceed) return;

    try {
      sonner.loading('Deleting customer...');
      const { customersService } = await import('../../lib/services');
      await customersService.delete(customerId);
      useCustomersStore.getState().deleteCustomer(customerId);
      sonner.success('Customer deleted successfully!');
    } catch (error) {
      console.error('Error deleting customer:', error);
      sonner.error('Failed to delete customer. Please try again.');
    } finally {
      sonner.close();
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerModal(true);
  };

  const handleWhatsAppRedirect = (phone: string) => {
    if (!phone) return;
    let digits = phone.replace(/\D/g, '');

    const dialCode = CURRENCY_DIAL_CODE[appSettings.currency] || '92';

    if (!digits.startsWith(dialCode)) {
      if (digits.startsWith('0')) {
        digits = dialCode + digits.substring(1);
      } else {
        digits = dialCode + digits;
      }
    }

    window.open(`https://wa.me/${digits}`, '_blank');
  };

  const filteredSalesByDate = useMemo(() =>
    filterSalesByDate(appSales, validStartDate, validEndDate, dateFilter, appSettings.country),
    [appSales, validStartDate, validEndDate, dateFilter, appSettings.country]);

  const totalCustomers = appCustomers.length;

  const totalPurchases = useMemo(() =>
    computeTotalPurchases(appCustomers, dateFilter, filteredSalesByDate),
    [appCustomers, dateFilter, filteredSalesByDate]);

  const getCustomerTotalPurchasesFn = (customerId: string, defaultTotal: number | undefined) =>
    getCustomerTotalPurchases(
      dateFilter === 'all' ? appSales : filteredSalesByDate,
      customerId,
      defaultTotal
    );

  const averagePurchase = totalCustomers > 0 ? totalPurchases / totalCustomers : 0;

  const activeCustomers = useMemo(() =>
    computeActiveCustomers(appCustomers, appSettings.country),
    [appCustomers, appSettings.country]);

  return (
    <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-6 max-w-[1400px] mx-auto">
      {/* Layer 1: Identity & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 xl:gap-10">
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner border border-primary/10">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="shrink-0 flex flex-col">
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{"Customers"}</h1>
              <p className="hidden sm:block text-gray-600 dark:text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">{"CRM Hub"} • {appCustomers.length} {"Records"}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleAddCustomer}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            {"Add Customer"}
          </Button>
        </div>
      </div>

      {/* Layer 2: Filter Toolbar */}
      <div className="relative z-30 bg-white/50 dark:bg-black/20 p-3 lg:p-4 rounded-[1.75rem] border border-gray-200/50 dark:border-white/5 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
        <div className="flex flex-col xl:flex-row gap-4">
          {/* Search — shared module */}
          <SharedSearchBar
            value={searchTerm}
            onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            placeholder={"Search customers..."}
          />

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <SearchableSelect
              label={"RANGE"}
              options={[
                { id: 'all', label: "ALL TIME" },
                { id: 'today', label: "TODAY" },
                { id: 'yesterday', label: "YESTERDAY" },
                { id: 'last7', label: "LAST 7 DAYS" },
                { id: 'thisMonth', label: "THIS MONTH" },
                { id: 'lastMonth', label: "PREVIOUS MONTH" },
                { id: 'custom', label: "CUSTOM RANGE" }
              ]}
              value={dateFilter}
              onChange={setDateFilter}
              icon={Receipt}
            />
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-3 p-2 bg-white/50 dark:bg-black/20 rounded-xl animate-in slide-in-from-top-2 w-full">
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-full sm:flex-1 px-3 py-2 text-[10px] font-black bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white uppercase shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <span className="hidden sm:block text-[10px] font-black text-gray-600 uppercase tracking-tighter">to</span>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="w-full sm:flex-1 px-3 py-2 text-[10px] font-black bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white uppercase shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Layer 3: Vibrant Stats section */}
      <div className="relative z-20 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-2">
        <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-600 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Total Customers"}</span>
            <span className="stat-card-value">{totalCustomers}</span>
          </div>
          <User className="stat-card-icon" />
        </div>

        <div className="stat-card bg-gradient-to-br from-blue-600 to-indigo-700 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Total Sales"}</span>
            <span className="stat-card-value">{formatCurrency(totalPurchases, appSettings.currency)}</span>
          </div>
          <CreditCard className="stat-card-icon" />
        </div>

        <div className="stat-card bg-gradient-to-br from-orange-500 to-amber-600 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Average Sale"}</span>
            <span className="stat-card-value">{formatCurrency(averagePurchase, appSettings.currency)}</span>
          </div>
          <Mail className="stat-card-icon" />
        </div>

        <div className="stat-card bg-gradient-to-br from-cyan-500 to-blue-500 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Active (30d)"}</span>
            <span className="stat-card-value">{activeCustomers}</span>
          </div>
          <Users className="stat-card-icon" />
        </div>
      </div>

      {/* Main View Container */}
      <div className="bg-white dark:bg-surface rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
        <CustomerTable
          filteredCustomers={filteredCustomers}
          paginatedCustomers={paginatedCustomers}
          appSettings={appSettings}
          canManageCustomers={canManageCustomers}
          currentPage={currentPage}
          totalPages={totalPages}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          setCurrentPage={setCurrentPage}
          setPageSize={setPageSize}
          handleViewCustomer={handleViewCustomer}
          handleEditCustomer={handleEditCustomer}
          handleDeleteCustomer={handleDeleteCustomer}
          handleWhatsAppRedirect={handleWhatsAppRedirect}
          getCustomerTotalPurchases={getCustomerTotalPurchasesFn}
        />
      </div>

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customer={editingCustomer}
      />

      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
}
