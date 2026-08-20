import { Wallet, Activity, Building2, ShoppingBag, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../lib/currencies';

interface DashboardCardsProps {
  todaySalesStats: { revenue: number; cash: number; card: number; online: number };
  todayStats: { sales: number; purchases: number };
  currency: string;
  flowRatio: number;
  payableStats: { toPay: number; advance: number };
  pendingPOsCount: number;
  lowStockCount: number;
}

export function DashboardCards({
  todaySalesStats,
  todayStats,
  currency,
  flowRatio,
  payableStats,
  pendingPOsCount,
  lowStockCount
}: DashboardCardsProps) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. Revenue Today */}
      <div
        className="stat-card bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-800 group cursor-pointer !min-h-[85px] py-2.5 px-4 rounded-[1.5rem]"
        onClick={() => navigate('/reports')}
      >
        <div className="stat-card-inner">
          <div className="space-y-0.5">
            <span className="stat-card-label text-[8.5px] tracking-widest">{"Revenue Today"}</span>
            <span className="stat-card-value text-base sm:text-lg lg:text-xl font-black">{formatCurrency(todaySalesStats.revenue, currency)}</span>
          </div>
          <div className="mt-2">
            <span className="text-[7.5px] font-black text-white/50 bg-white/15 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wider">
              {todaySalesStats.cash > 0 ? "CASH READY" : "NO CASH"}
            </span>
          </div>
        </div>
        <Wallet className="stat-card-icon !h-8 !w-8 -bottom-1 -right-1 !opacity-10 group-hover:!opacity-20" />
      </div>

      {/* 2. Flow Monitor */}
      <div
        className="stat-card bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 group cursor-pointer !min-h-[85px] py-2.5 px-4 rounded-[1.5rem]"
        onClick={() => navigate('/reports')}
      >
        <div className="stat-card-inner">
          <div className="space-y-0.5">
            <span className="stat-card-label text-[8.5px] tracking-widest">{"Flow Monitor"}</span>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between text-[8px] font-black text-white/60">
                <span>{"INFLOW"}</span>
                <span className="text-white">+{formatCurrency(todayStats.sales, currency, false)}</span>
              </div>
              <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${flowRatio}%` }} />
              </div>
            </div>
          </div>
        </div>
        <Activity className="stat-card-icon !h-8 !w-8 -bottom-1 -right-1 !opacity-10 group-hover:!opacity-20" />
      </div>

      {/* 3. Payables */}
      <div
        className="stat-card bg-gradient-to-br from-rose-500 via-red-600 to-red-800 group cursor-pointer shadow-red-500/10 !min-h-[85px] py-2.5 px-4 rounded-[1.5rem]"
        onClick={() => navigate('/suppliers')}
      >
        <div className="stat-card-inner">
          <div className="space-y-0.5">
            <span className="stat-card-label text-[8.5px] tracking-widest">{"Payables"}</span>
            <span className="stat-card-value text-base sm:text-lg lg:text-xl font-black">{formatCurrency(payableStats.toPay, currency)}</span>
          </div>
        </div>
        <Building2 className="stat-card-icon !h-8 !w-8 -bottom-1 -right-1 !opacity-10 group-hover:!opacity-20" />
      </div>

      {/* 4. Orders */}
      <div
        className="stat-card bg-gradient-to-br from-amber-500 via-orange-600 to-orange-800 group cursor-pointer shadow-orange-500/10 !min-h-[85px] py-2.5 px-4 rounded-[1.5rem]"
        onClick={() => navigate('/purchase-orders')}
      >
        <div className="stat-card-inner">
          <div className="space-y-0.5">
            <span className="stat-card-label text-[8.5px] tracking-widest">{"Pending"}</span>
            <span className="stat-card-value text-base sm:text-lg lg:text-xl font-black">{pendingPOsCount}</span>
          </div>
        </div>
        <ShoppingBag className="stat-card-icon !h-8 !w-8 -bottom-1 -right-1 !opacity-10 group-hover:!opacity-20" />
      </div>

      {/* 5. Inventory */}
      <div
        className={`stat-card group cursor-pointer transition-all duration-500 !min-h-[85px] py-2.5 px-4 rounded-[1.5rem] ${lowStockCount > 0
          ? 'bg-gradient-to-br from-pink-600 to-rose-700 shadow-rose-500/20 ring-1 ring-white/20'
          : 'bg-gradient-to-br from-pink-500 to-fuchsia-700'
          }`}
        onClick={() => navigate('/inventory')}
      >
        <div className="stat-card-inner">
          <div className="space-y-0.5">
            <span className="stat-card-label text-[8.5px] tracking-widest">{"Inventory"}</span>
            <span className="stat-card-value text-base sm:text-lg lg:text-xl font-black">{lowStockCount}</span>
            <p className="text-[7.5px] font-black text-white/50 uppercase tracking-wider">{lowStockCount > 0 ? "CRITICAL ALERT" : "OPTIMIZED"}</p>
          </div>
        </div>
        <Package className="stat-card-icon !h-8 !w-8 -bottom-1 -right-1 !opacity-10 group-hover:!opacity-20" />
      </div>
    </div>
  );
}
