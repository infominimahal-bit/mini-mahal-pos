import { create } from 'zustand';
import { Expense } from '../types';

interface ExpensesState {
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  addExpense: (e: Expense) => void;
  updateExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
  expenses: [],

  setExpenses: (expenses) => set({ expenses }),

  addExpense: (expense) => set((st) =>
    st.expenses.some((e) => e.id === expense.id) ? st : { expenses: [expense, ...st.expenses] }
  ),

  updateExpense: (expense) => set((st) =>
    !expense?.id ? st : { expenses: (st.expenses || []).map((e) => (e && e.id === expense.id) ? expense : e) }
  ),

  deleteExpense: (id) => set((st) => ({ expenses: st.expenses.filter((e) => e.id !== id) })),
}));
