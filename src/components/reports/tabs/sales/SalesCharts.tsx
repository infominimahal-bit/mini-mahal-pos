import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../../../../lib/currencies';

interface Props {
  salesData: any[];
  featureAnalytics: any;
  categoryData: any[];
  currency: string;
  theme: string;
}

const COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#EC4899'];

export function SalesCharts({ salesData, featureAnalytics, categoryData, currency, theme }: Props) {
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#171717' : 'white',
    border: theme === 'dark' ? '1px solid #333' : '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    color: theme === 'dark' ? '#fff' : '#000'
  };
  const itemStyle = { color: theme === 'dark' ? '#e5e7eb' : '#374151' };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="card p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-primary" />{"Sales Trend"}
        </h3>
        <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 240 : 300}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#f0f0f0'} />
            <XAxis dataKey="date" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={12} />
            <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={12} />
            <Tooltip formatter={(value: any, name: string) => [name === 'sales' ? formatCurrency(Number(value), currency) : value, name === 'sales' ? "Sales" : "Transactions"]} contentStyle={tooltipStyle} itemStyle={itemStyle} />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} name={"Sales"} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="transactions" stroke="#059669" strokeWidth={3} name={"Transactions"} dot={{ fill: '#059669', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6 border border-primary/20 shadow-emerald-500/5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <PieIcon className="h-5 w-5 mr-2 text-indigo-500" />{"Revenue By Item Type"}
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={[
                { name: "Physical Products", value: featureAnalytics.productRevenue },
                { name: "Services", value: featureAnalytics.serviceRevenue },
                { name: "Modifiers & Add-ons", value: featureAnalytics.modifiersRevenue }
              ].filter(d => d.value > 0)}
              cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
            >
              {[
                { name: "Physical Products", value: featureAnalytics.productRevenue },
                { name: "Services", value: featureAnalytics.serviceRevenue },
                { name: "Modifiers & Add-ons", value: featureAnalytics.modifiersRevenue }
              ].filter(d => d.value > 0).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={['#3B82F6', '#8B5CF6', '#EC4899'][index % 3]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} contentStyle={tooltipStyle} itemStyle={itemStyle} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-primary" />{"Sales by Category"}
        </h3>
        <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 240 : 300}>
          <PieChart>
            <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#10b981" dataKey="value">
              {categoryData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
            </Pie>
            <Tooltip formatter={(value: any) => [formatCurrency(Number(value), currency), "Revenue"]} contentStyle={tooltipStyle} itemStyle={itemStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {featureAnalytics.topVariants.length > 0 && (
        <div className="card p-6 border border-purple-500/20 shadow-purple-500/5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <ShoppingBag className="h-5 w-5 mr-2 text-purple-500" />{"Top Selling Variants"}
          </h3>
          <div className="space-y-4">
            {featureAnalytics.topVariants.map((variant: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{variant.name}</span>
                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{variant.quantity} {"sold"}</span>
                </div>
                <span className="font-bold text-primary dark:text-emerald-400 text-sm">
                  {formatCurrency(variant.revenue, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
