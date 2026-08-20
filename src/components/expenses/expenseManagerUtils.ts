import { Expense } from '../../types';
import { normalizePaymentMethod } from '../../lib/services';
import {
  getTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone,
  getStartOfInputDayInTimezone, getEndOfInputDayInTimezone
} from '../../lib/dateUtils';

export interface ExpenseDateBoundaries {
  validStartDate: Date;
  validEndDate: Date;
}

export function computeExpenseDateBoundaries(
  dateRange: string,
  startDateInput: string,
  endDateInput: string,
  country: string
): ExpenseDateBoundaries {
  const timezone = getTimezone(country);
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (dateRange === 'custom') {
    startDate = startDateInput
      ? new Date(getStartOfInputDayInTimezone(startDateInput, timezone).getTime())
      : new Date(getStartOfDayInTimezone(now, timezone).getTime());
    endDate = endDateInput
      ? new Date(getEndOfInputDayInTimezone(endDateInput, timezone).getTime())
      : new Date(getEndOfDayInTimezone(now, timezone).getTime());
  } else if (dateRange === 'today') {
    startDate = getStartOfDayInTimezone(now, timezone);
    endDate = getEndOfDayInTimezone(now, timezone);
  } else if (dateRange === 'yesterday') {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    startDate = getStartOfDayInTimezone(yesterday, timezone);
    endDate = getEndOfDayInTimezone(yesterday, timezone);
  } else if (dateRange === 'last7') {
    const last7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDate = getStartOfDayInTimezone(last7, timezone);
    endDate = getEndOfDayInTimezone(now, timezone);
  } else if (dateRange === 'thisMonth') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = getStartOfDayInTimezone(startOfMonth, timezone);
    endDate = getEndOfDayInTimezone(now, timezone);
  } else if (dateRange === 'lastMonth') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    startDate = getStartOfDayInTimezone(lm, timezone);
    endDate = getEndOfDayInTimezone(lmEnd, timezone);
  } else if (dateRange === 'all') {
    startDate = new Date(Date.UTC(2000, 0, 1));
    endDate = getEndOfDayInTimezone(now, timezone);
  } else {
    // Fallback
    startDate = getStartOfDayInTimezone(now, timezone);
    endDate = getEndOfDayInTimezone(now, timezone);
  }

  return { validStartDate: startDate, validEndDate: endDate };
}

export function buildCashiersList(
  appExpenses: Expense[],
  appUsers: { name?: string }[]
): string[] {
  const userNames = appUsers.map(u => u.name).filter(Boolean) as string[];
  const expenseUsers = appExpenses.map(e => e.addedBy).filter(Boolean) as string[];
  return ['all', ...Array.from(new Set([...userNames, ...expenseUsers]))];
}

export function filterExpenses(
  appExpenses: Expense[],
  searchTerm: string,
  selectedCategory: string,
  selectedPaymentMethod: 'all' | 'cash' | 'card' | 'online',
  selectedCashier: string,
  validStartDate: Date,
  validEndDate: Date,
  dateRange: string,
  country: string
): Expense[] {
  const timezone = getTimezone(country);
  const effectiveStart = getStartOfDayInTimezone(validStartDate, timezone).getTime();
  const effectiveEnd = getEndOfDayInTimezone(validEndDate, timezone).getTime();

  return appExpenses.filter(expense => {
    const expenseDate = new Date(expense.date).getTime();

    const matchesSearch = (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    const matchesPayment = selectedPaymentMethod === 'all' || normalizePaymentMethod(expense.paymentMethod) === selectedPaymentMethod;
    const matchesDate = dateRange === 'all' || (expenseDate >= effectiveStart && expenseDate <= effectiveEnd);
    const matchesCashier = selectedCashier === 'all' || expense.addedBy === selectedCashier;
    return matchesSearch && matchesCategory && matchesPayment && matchesDate && matchesCashier;
  });
}

export interface ExpenseStats {
  filteredTotal: number;
  thisMonthTotal: number;
}

export function computeExpenseStats(
  country: string,
  filteredExpenses: Expense[]
): ExpenseStats {
  const timezone = getTimezone(country);
  const now = new Date();
  const monthStart = getStartOfDayInTimezone(new Date(now.getFullYear(), now.getMonth(), 1), timezone).getTime();
  const monthEnd = getEndOfDayInTimezone(new Date(now.getFullYear(), now.getMonth() + 1, 0), timezone).getTime();

  const thisMonthTotal = filteredExpenses
    .filter(e => {
      const d = new Date(e.date).getTime();
      return d >= monthStart && d <= monthEnd;
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return { filteredTotal, thisMonthTotal };
}

export function computeTopCategory(
  filteredExpenses: Expense[]
): { name: string; amount: number } | null {
  const catMap: Record<string, number> = {};
  filteredExpenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
  });
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  return sorted[0] ? { name: sorted[0][0], amount: sorted[0][1] } : null;
}
