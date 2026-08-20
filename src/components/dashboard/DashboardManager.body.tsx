import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  Building2,
  ShoppingBag,
  Package,
  AlertCircle,
  ArrowRight,
  Clock,
  Activity,
  Zap,
  Star
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { MagicalClock } from './MagicalClock';
import { formatCurrency } from '../../lib/currencies';
import { formatInTimeZone } from '../../lib/dateUtils';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../../shared/ui';
import { DashboardCards } from './DashboardCards';
import { useDashboardData } from './DashboardManager.data';

export function DashboardManager() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    currency,
    country,
    todaySalesStats,
    todayStats,
    flowRatio,
    payableStats,
    pendingPOsCount,
    lowStockCount,
    hourlyData,
    recentActivity,
  } = useDashboardData();

  return (
    <div className="main-content-scroll p-2.5 sm:p-4 bg-gray-50/50 dark:bg-app flex flex-col gap-4">
      {/* --- COMPACT HERO GRID WITH MAGICAL WATCH --- */}
      <div className="grid grid-cols-[1fr_auto] lg:grid-cols-3 gap-3 items-stretch">
        
        {/* Left: Identity Greeting Card */}
        <div className="lg:col-span-2 flex flex-col justify-between p-4 sm:p-5 bg-gradient-to-br from-indigo-950 via-[#0A0A0A] to-black rounded-[2rem] border border-indigo-500/10 shadow-2xl relative overflow-hidden group min-h-[140px] sm:min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            <TrendingUp className="w-32 h-32 -mr-8 -mt-8 text-indigo-500" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest">{"System Live"}</span>
              </div>
              <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 flex items-center gap-1">
                <Activity className="w-2.5 h-2.5" />
                <span className="text-[8px] font-black uppercase tracking-widest">POS</span>
              </div>
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">
              {"Control Center"}
            </h1>
            <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 max-w-xl leading-normal hidden sm:block">
              {"Welcome back. Your business pulse is stable and scaling."}
              <br />
              {"Monitor real-time transactions and inventory health across your workspace."}
            </p>
          </div>

          <div className="relative z-10 mt-2 sm:mt-3 flex items-center gap-2">
            <Button
              onClick={() => navigate('/pos')}
              icon={<ArrowRight className="w-3 h-3" />}
              className="!min-h-0 !px-4 sm:!px-5 !py-2 sm:!py-2.5 !rounded-xl !text-[8px] sm:!text-[9px] !font-black !gap-1.5 !shadow-xl !shadow-emerald-500/10 !bg-gradient-to-r !from-emerald-500 !to-teal-600 !text-white !hover:bg-transparent"
            >
              {"Launch POS"}
            </Button>
            <Button
              onClick={() => navigate('/inventory')}
              className="!min-h-0 !px-4 sm:!px-5 !py-2 sm:!py-2.5 !rounded-xl !text-[8px] sm:!text-[9px] !font-black !bg-white/5 !text-white !border !border-white/10 !hover:bg-white/10"
            >
              {"Manage Stock"}
            </Button>
          </div>
        </div>

        {/* Right: The Magical Clock Card — compact on mobile, full on lg */}
        <div className="w-[110px] sm:w-auto lg:w-auto bg-gradient-to-b from-indigo-950 to-black rounded-[2rem] p-2 sm:p-3 border border-indigo-500/15 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center group">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-500/5 rounded-full" />
          </div>

          {/* Scale down the clock container so it fits the compact height perfectly */}
          <div className="relative z-10 w-full h-full max-w-[110px] sm:max-w-[130px] aspect-square flex items-center justify-center">
            <MagicalClock />
          </div>
        </div>
      </div>

      {/* Cards always mounted — never swap with skeleton to prevent blink */}
      <DashboardCards
        todaySalesStats={todaySalesStats}
        todayStats={todayStats}
        currency={currency}
        flowRatio={flowRatio}
        payableStats={payableStats}
        pendingPOsCount={pendingPOsCount}
        lowStockCount={lowStockCount}
      />

      {/* --- BUSINESS PULSE & LIVE FEED (THE ANALYTICS) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Live Business Pulse Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-[#080808] rounded-[2.5rem] p-5 sm:p-6 border border-primary/10 dark:border-white/5 shadow-2xl relative overflow-hidden group h-[350px]">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
              <Activity className="w-48 h-48 -mr-12 -mt-12 text-primary" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{"Business Pulse"}</h3>
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1">{"Live Momentum Analytic"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">{"Peak Sales"}</p>
                    <p className="text-xs font-black text-gray-900 dark:text-white">{formatCurrency(Math.max(...hourlyData.map(d => d.value), 0), currency)}</p>
                  </div>
                  <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                    <Zap className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#000',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '12px 20px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        color: '#fff',
                        fontWeight: 900
                      }}
                      itemStyle={{ color: '#10B981', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                      formatter={(value: number) => formatCurrency(value, currency)}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10B981"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorPulse)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Live Feed - Compact List */}
          <div className="lg:col-span-1 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-black rounded-[2.5rem] p-5 sm:p-6 border border-blue-500/10 dark:border-white/5 shadow-2xl relative overflow-hidden flex flex-col h-[350px]">
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">{"Live Feed"}</h3>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">{"Real-time Stream"}</p>
              </div>
              <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-hide pb-2">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="relative mb-4">
                    <Star className="relative w-10 h-10 text-blue-400/30" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">{"Standby"}</p>
                </div>
              ) : (
                recentActivity.map((sale, i) => (
                  <div
                    key={sale.id}
                    onClick={() => navigate('/transactions')}
                    className="bg-white/[0.03] hover:bg-white/[0.08] transition-all p-3 rounded-[1.25rem] border border-white/5 flex items-center justify-between group active:scale-95 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sale.paymentMethod === 'cash' ? 'bg-primary/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {sale.paymentMethod === 'cash' ? <Wallet className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">TRX-{sale.id.slice(-4)}</p>
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{formatInTimeZone(sale.createdAt || sale.timestamp, country, 'HH:mm')}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-emerald-400">{formatCurrency(sale.total - (sale.refundedAmount || 0), currency, false)}</p>
                      <p className="text-[7.5px] font-black text-white/20 uppercase tracking-widest">{sale.items?.length || 0} {sale.items?.length === 1 ? "ITEM" : "ITEMS"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Fade out bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none rounded-b-[2.5rem]" />
          </div>
        </div>
    </div>
  );
}
