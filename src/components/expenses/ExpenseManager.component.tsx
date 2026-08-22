import { useExpensesStore, useSettingsStore, useUsersStore } from '../../stores';
import { useState, useMemo, useRef } from 'react';
import {
  Plus, TrendingDown,
  Tag, CreditCard, User,
  Wallet, LayoutGrid, Zap,
  Utensils, Fuel, Home, Users,
  Package, Megaphone, Wrench, ShieldCheck,
  Receipt, MoreHorizontal
} from 'lucide-react';
import { computeExpenseDateBoundaries, buildCashiersList, filterExpenses, computeExpenseStats, computeTopCategory } from './expenseManagerUtils';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { ExpenseModal } from './ExpenseModal';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { formatCurrency } from '../../lib/currencies';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { Button, DateRangePicker, Pagination } from '../../shared/ui';
import { ExpenseTable } from './ExpenseTable';
import { useExpenseManagerActions } from './useExpenseManagerActions';

export function ExpenseManager() {
  const appSettings = useSettingsStore(s => s.settings);
  const appUsers = useUsersStore(s => s.users);
  const appExpenses = useExpensesStore(s => s.expenses);
  const appCurrentUser = useUsersStore(s => s.currentUser);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'all' | 'cash' | 'card' | 'online'>('all');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [dateRange, setDateRange] = useState('today');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [ITEMS_PER_PAGE, setPageSize] = useState(25);

  const paymentMethodScrollRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 200;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const CATEGORY_ICONS: Record<string, any> = {
    'all': LayoutGrid,
    'Utilities': Zap,
    'Food': Utensils,
    'Fuel': Fuel,
    'Rent': Home,
    'Salaries': Users,
    'Supplies': Package,
    'Marketing': Megaphone,
    'Maintenance': Wrench,
    'Insurance': ShieldCheck,
    'Taxes': Receipt,
    'Other': MoreHorizontal
  };

  const { validStartDate, validEndDate } = useMemo(() =>
    computeExpenseDateBoundaries(dateRange, startDateInput, endDateInput, appSettings.country),
    [dateRange, startDateInput, endDateInput, appSettings.country]);

  const cashiersList = useMemo(() =>
    buildCashiersList(appExpenses, appUsers),
    [appExpenses, appUsers]);

  const filteredExpenses = useMemo(() =>
    filterExpenses(
      appExpenses, searchTerm, selectedCategory, selectedPaymentMethod,
      selectedCashier, validStartDate, validEndDate, dateRange, appSettings.country
    ),
    [appExpenses, searchTerm, selectedCategory, selectedPaymentMethod, selectedCashier, validStartDate, validEndDate, dateRange, appSettings.country]);

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() =>
    computeExpenseStats(appSettings.country, filteredExpenses),
    [appSettings.country, filteredExpenses]);

  const { handleSave, handleDelete } = useExpenseManagerActions({
    editingExpense,
    setEditingExpense,
    setIsModalOpen,
    appCurrentUser,
  });

  // Top spending category
  const topCategory = useMemo(() =>
    computeTopCategory(filteredExpenses),
    [filteredExpenses]);

  return (
    <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-6 max-w-[1400px] mx-auto">
      {/* Layer 1: Identity & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 xl:gap-10">
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner border border-primary/10">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="shrink-0 flex flex-col">
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{"Expenses"}</h1>
              <p className="hidden sm:block text-gray-600 dark:text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">{"Management Hub"} • {appExpenses.length} {"Records"}</p>
            </div>
          </div>

          {/* Redundant Switcher Removed to Fix Double Tabs */}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
            className="!min-h-0 !px-5 !py-2.5 !rounded-xl !text-[10px] !font-black !shadow-lg !shadow-emerald-500/20 hover:!scale-[1.02]"
          >
            <Plus className="h-3.5 w-3.5" /> <span>{"Add Expense"}</span>
          </Button>
        </div>
      </div>

      {/* Layer 2: Filter Toolbar (Smart Context) */}
      <div className="relative z-30 bg-white/50 dark:bg-black/20 p-3 lg:p-4 rounded-[1.75rem] border border-gray-200/50 dark:border-white/5 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
        <div className="flex flex-col xl:flex-row gap-4">
          {/* Search Box — shared module */}
          <SharedSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={"Search expenses..."}
          />

          {/* Filters Grid */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <SearchableSelect
              options={[
                { id: 'all', label: "All Categories" },
                ...EXPENSE_CATEGORIES.map(c => ({ id: c, label: c }))
              ]}
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder={"Category"}
              icon={Tag}
            />
            <SearchableSelect
              options={[
                { id: 'all', label: "All Methods" },
                { id: 'cash', label: "Cash" },
                { id: 'card', label: "Card" },
                { id: 'online', label: "Online Wallet" }
              ]}
              value={selectedPaymentMethod}
              onChange={(val: any) => setSelectedPaymentMethod(val)}
              placeholder={"Payment"}
              icon={CreditCard}
            />
            <SearchableSelect
              options={cashiersList.map(u => ({ id: u, label: u === 'all' ? "All Users" : u.toUpperCase() }))}
              value={selectedCashier}
              onChange={setSelectedCashier}
              placeholder={"User"}
              icon={User}
            />
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
              icon={Receipt}
            />
          </div>
        </div>
      </div>

      {/* Layer 3: Vibrant Stats section */}
      <div className="relative z-20 grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mt-2">
        <div className="stat-card bg-gradient-to-br from-rose-500 to-red-700 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Filtered Total"}</span>
            <span className="stat-card-value">{formatCurrency(stats.filteredTotal, appSettings.currency)}</span>
            <p className="text-[7px] font-black text-rose-100/40 uppercase tracking-[0.2em] mt-1">{filteredExpenses.length} {"Records"}</p>
          </div>
          <TrendingDown className="stat-card-icon" />
        </div>

        <div className="stat-card bg-gradient-to-br from-amber-500 to-orange-700 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"This Month"}</span>
            <span className="stat-card-value">{formatCurrency(stats.thisMonthTotal, appSettings.currency)}</span>
            <p className="text-[7px] font-black text-amber-100/40 uppercase tracking-[0.2em] mt-1">{"Current Month"}</p>
          </div>
          <Wallet className="stat-card-icon" />
        </div>

        <div className="stat-card bg-gradient-to-br from-blue-500 to-indigo-700 col-span-2 lg:col-span-1 group">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Top Category"}</span>
            <span className="stat-card-value">{topCategory?.name || "None"}</span>
            <p className="text-[7px] font-black text-blue-100/40 uppercase tracking-[0.2em] mt-1">{topCategory ? formatCurrency(topCategory.amount, appSettings.currency) : '—'}</p>
          </div>
          <Tag className="stat-card-icon" />
        </div>
      </div>

      {/* Main View Container */}
      <div className="bg-white dark:bg-surface rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">

        <ExpenseTable
          filteredExpenses={filteredExpenses}
          paginatedExpenses={paginatedExpenses}
          appSettings={appSettings}
          setEditingExpense={setEditingExpense}
          setIsModalOpen={setIsModalOpen}
          handleDelete={handleDelete}
        />

        {/* Premium Pagination Footer */}

        <div className="p-4 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/5 flex items-center justify-between gap-4">
          <p className="hidden sm:block text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest italic truncate">{"Records"} {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredExpenses.length)} {"of"} {filteredExpenses.length}</p>
          <div className="mx-auto sm:mx-0">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={ITEMS_PER_PAGE}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSave}
        expense={editingExpense}
      />
    </div>
  );
}
