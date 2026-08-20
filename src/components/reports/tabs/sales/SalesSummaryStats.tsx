import React from 'react';
import { TrendingUp, ShoppingCart, DollarSign, BarChart3, Wallet, PieChart } from 'lucide-react';
import { formatCurrency } from '../../../../lib/currencies';

interface Props {
  totalRevenue: number;
  totalTransactions: number;
  averageTransaction: number;
  totalCostOfGoods: number;
  grossProfit: number;
  totalExpenseAmount: number;
  netProfit: number;
  currency: string;
}

export function SalesSummaryStats({
  totalRevenue, totalTransactions, averageTransaction, totalCostOfGoods,
  grossProfit, totalExpenseAmount, netProfit, currency
}: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3 lg:gap-4">
      <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-700">
        <div className="stat-card-inner">
          <span className="stat-card-label">{"Total Revenue"}</span>
          <span className="stat-card-value">{formatCurrency(totalRevenue, currency)}</span>
        </div>
        <TrendingUp className="stat-card-icon" />
      </div>
      <div className="stat-card bg-gradient-to-br from-blue-500 to-indigo-700">
        <div className="stat-card-inner">
          <span className="stat-card-label">{"Transactions"}</span>
          <span className="stat-card-value">{totalTransactions}</span>
        </div>
        <ShoppingCart className="stat-card-icon" />
      </div>
      <div className="stat-card bg-gradient-to-br from-violet-500 to-purple-600">
        <div className="stat-card-inner">
          <span className="stat-card-label">{"Avg Transaction"}</span>
          <span className="stat-card-value">{formatCurrency(averageTransaction, currency)}</span>
        </div>
        <TrendingUp className="stat-card-icon" />
      </div>
      <div className="stat-card bg-gradient-to-br from-orange-500 to-amber-600">
        <div className="stat-card-inner">
          <span className="stat-card-label">{"COGS (Product Cost)"}</span>
          <span className="stat-card-value">{formatCurrency(totalCostOfGoods, currency)}</span>
        </div>
        <DollarSign className="stat-card-icon" />
      </div>
      <div className="stat-card bg-gradient-to-br from-cyan-500 to-teal-600">
        <div className="stat-card-inner">
          <span className="stat-card-label">{"Gross Profit"}</span>
          <span className="stat-card-value">{formatCurrency(grossProfit, currency)}</span>
          <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mt-1">{"Rev - Cost"}</p>
        </div>
        <BarChart3 className="stat-card-icon" />
      </div>
      <div className="stat-card bg-gradient-to-br from-rose-500 to-red-600">
        <div className="stat-card-inner">
          <span className="stat-card-label">{"Expenses"}</span>
          <span className="stat-card-value">{formatCurrency(totalExpenseAmount, currency)}</span>
        </div>
        <Wallet className="stat-card-icon" />
      </div>
      <div className="stat-card bg-gradient-to-br from-amber-500 to-orange-600">
        <div className="stat-card-inner">
          <span className="stat-card-label">{"Net Profit"}</span>
          <span className="stat-card-value">{formatCurrency(netProfit, currency)}</span>
          <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mt-1">{"GP - EXP"}</p>
        </div>
        <PieChart className="stat-card-icon" />
      </div>
    </div>
  );
}
