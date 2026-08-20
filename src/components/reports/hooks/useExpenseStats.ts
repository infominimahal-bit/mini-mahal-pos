import { useMemo } from 'react';
import { subDays } from 'date-fns';
import { formatAppDateChart } from '../../../lib/dateUtils';

export function useExpenseStats(filteredExpenses: any[], validStartDate: Date, validEndDate: Date, dateRange: string, appSettings: any) {
  const expensesTrendData = useMemo(() => {
    const expensesByDay: Record<string, { date: string; amount: number; count: number }> = {};
    const days = Math.max(1, Math.round((validEndDate.getTime() - validStartDate.getTime()) / 86400000) + 1);
    for (let i = days - 1; i >= 0; i--) {
      const date = formatAppDateChart(subDays(validEndDate, i), appSettings?.country ?? 'US');
      expensesByDay[date] = { date, amount: 0, count: 0 };
    }
    filteredExpenses.forEach(expense => {
      const date = formatAppDateChart(expense.date, appSettings?.country ?? 'US');
      if (expensesByDay[date]) {
        expensesByDay[date].amount += Number(expense.amount);
        expensesByDay[date].count += 1;
      }
    });
    return Object.values(expensesByDay);
  }, [filteredExpenses, dateRange, validEndDate, validStartDate, appSettings]);

  const expenseCategoryData = useMemo(() => {
    const categories: Record<string, { name: string; value: number }> = {};
    filteredExpenses.forEach(expense => {
      const category = expense.category;
      if (!categories[category]) categories[category] = { name: category, value: 0 };
      categories[category].value += Number(expense.amount);
    });
    return Object.values(categories);
  }, [filteredExpenses]);

  const topExpensesList = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);
  }, [filteredExpenses]);

  return { expensesTrendData, expenseCategoryData, topExpensesList };
}
