import { Edit2, Trash2, TrendingDown, ShoppingBag } from 'lucide-react';
import { formatAppDate, formatAppTime } from '../../lib/dateUtils';
import { formatCurrency } from '../../lib/currencies';
import { Expense } from '../../types';
import { Badge, Button, EmptyState } from '../../shared/ui';

interface ExpenseTableProps {
  filteredExpenses: Expense[];
  paginatedExpenses: Expense[];
  appSettings: any;
  setEditingExpense: (expense: Expense) => void;
  setIsModalOpen: (open: boolean) => void;
  handleDelete: (id: string) => void;
}

export function ExpenseTable({
  filteredExpenses,
  paginatedExpenses,
  appSettings,
  setEditingExpense,
  setIsModalOpen,
  handleDelete
}: ExpenseTableProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest">{"Date & Time"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest">{"Description"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-center">{"Category"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-center">{"Method"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-right">{"Amount"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-right">{"Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/5">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-20 text-center">
                  <EmptyState
                    icon={<ShoppingBag className="h-12 w-12 text-gray-600" />}
                    title={"No expenses found"}
                    className="!p-0 !opacity-20"
                  />
                </td>
              </tr>
            ) : (
              paginatedExpenses.map((expense) => (
                <tr key={expense.id} className="group hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="p-4">
                    <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">{formatAppDate(expense.date, appSettings.country)}</p>
                    <p className="text-[9px] text-gray-600 font-bold mt-1">{formatAppTime(expense.date, appSettings.country)}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase truncate max-w-[200px]">{expense.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {expense.notes && <span className="text-[9px] text-gray-500 font-medium truncate max-w-[150px]">{expense.notes}</span>}
                      {expense.notes && expense.addedBy && <span className="text-gray-300 dark:text-white/10 text-[9px]">•</span>}
                      {expense.addedBy && <span className="text-[9px] text-primary font-bold uppercase tracking-tight">By {expense.addedBy}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge tone="warning" size="sm">
                      {expense.category}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <Badge tone="success" size="sm">
                      {expense.paymentMethod}
                    </Badge>
                  </td>
                  <td className="p-4 text-right font-black text-rose-500 text-sm">
                    -{formatCurrency(expense.amount, appSettings.currency)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                        aria-label="Edit expense"
                        className="!min-h-0 !p-2 !rounded-xl !bg-emerald-50 dark:!bg-primary/10 !text-primary hover:!scale-110 active:!scale-95"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(expense.id)}
                        aria-label="Delete expense"
                        className="!min-h-0 !p-2 !rounded-xl !bg-red-50 dark:!bg-red-500/10 !text-red-600 hover:!scale-110 active:!scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Expert Density) */}
      <div className="lg:hidden p-3 sm:p-4">
        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-10 w-10 text-gray-600 opacity-10" />}
            title={"No expenses recorded"}
            className="!py-10"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {paginatedExpenses.map(expense => (
              <div
                key={expense.id}
                onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                className="relative flex flex-col p-3 sm:p-4 rounded-[1.5rem] bg-white dark:bg-surface border border-gray-200 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-8 w-8 bg-rose-500/10 rounded-lg flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    </div>
                    <Badge tone="warning" size="sm" className="!text-[8px] !px-1.5 !py-0.5 !rounded-md !bg-orange-500/10 !text-orange-500 !border-orange-500/20 !tracking-tight">
                      {(expense.category || 'General').substring(0, 8)}
                    </Badge>
                  </div>

                  <h3 className="font-black text-gray-900 dark:text-white uppercase text-[10px] leading-tight truncate mb-1">
                    {expense.description}
                  </h3>
                  <p className="text-[8px] text-gray-600 font-bold uppercase tracking-tight mb-3">
                    {formatAppDate(expense.date, appSettings.country)} {expense.addedBy ? `| By ${expense.addedBy}` : ''}
                  </p>

                  <div className="mt-auto pt-2 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <p className="text-[11px] font-black text-rose-500">
                      -{formatCurrency(expense.amount, appSettings.currency)}
                    </p>
                    <span className="text-[8px] font-black text-gray-600 uppercase">
                      {expense.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
