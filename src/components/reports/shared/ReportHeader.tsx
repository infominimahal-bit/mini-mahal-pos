import React from 'react';
import { ChevronLeft, PieChart as PieIcon, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { formatAppDate } from '../../../lib/dateUtils';
import { useNavigate } from 'react-router-dom';

interface Props {
  validStartDate: Date;
  validEndDate: Date;
  appSettings: any;
  isDataLoading: boolean;
  appCurrentUser: any;
  reportType: string;
}

export function ReportHeader({
  validStartDate, validEndDate, appSettings, isDataLoading, appCurrentUser, reportType
}: Props) {
  const navigate = useNavigate();
  const TABS = [
    { id: 'sales', label: "DASHBOARD", icon: TrendingUp, color: 'bg-primary' },
    { id: 'inventory', label: "INVENTORY", icon: PieIcon, color: 'bg-blue-600' },
    { id: 'customers', label: "CUSTOMERS", icon: PieIcon, color: 'bg-teal-600' },
    { id: 'expenses', label: "EXPENSES", icon: PieIcon, color: 'bg-rose-600' },
    { id: 'financial', label: "PAYMENTS", icon: PieIcon, color: 'bg-indigo-600' },
    { id: 'salesmen', label: "SALESMEN", icon: PieIcon, color: 'bg-cyan-600' },
    { id: 'suppliers', label: "SUPPLIERS", icon: PieIcon, color: 'bg-amber-600' },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 xl:gap-10">
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }))}
            icon={<ChevronLeft className="h-4 w-4" />}
            className="!min-h-0 !p-2 !rounded-xl !gap-1 !text-gray-600 dark:!text-gray-400 mr-1 !hover:bg-gray-100 dark:!hover:bg-white/5"
          >
            <span className="hidden sm:inline text-[8px] font-black uppercase tracking-widest">{"Back"}</span>
          </Button>
          <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block" />

          <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner border border-primary/10">
            <PieIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{"Intelligence"}</h1>
              <p className="hidden sm:block text-gray-600 dark:text-gray-400 text-[7px] font-black uppercase tracking-[0.2em] mt-0.5 opacity-60">
                {formatAppDate(validStartDate, appSettings?.country)} - {formatAppDate(validEndDate, appSettings?.country)}
              </p>
            </div>
            {isDataLoading && (
              <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in zoom-in duration-300">
                <RefreshCw className="h-2.5 w-2.5 text-primary animate-spin" />
                <span className="text-[8px] font-black text-primary uppercase tracking-widest">Live Sync</span>
              </div>
            )}
          </div>
        </div>

        <div className="chip-nav-container flex-1 lg:flex-none">
          {TABS.filter(tab => {
            const role = appCurrentUser?.role;
            const perms = appCurrentUser?.permissions || [];
            const hasFullAccess = role === 'admin' || role === 'manager' || perms.includes('access_reports');
            return hasFullAccess;
          }).map(tab => {
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate('/reports/' + tab.id)}
                className={`chip-nav-item ${isActive ? `${tab.color} text-white shadow-lg` : 'text-gray-600'}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
