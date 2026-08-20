import { ChevronLeft, ChevronRight, History, PackageSearch } from 'lucide-react';
import { Button, EmptyState } from '../../../shared/ui';
import { formatAppTime } from '../../../lib/dateUtils';
import type { ProductDetailController } from './useProductDetail';

export function ProductHistory({ d }: { d: ProductDetailController }) {
  const { t, appSettings, movementHistory, totalHistoryPages, historyPage, setHistoryPage, paginatedHistory, handleRowClick, clickedRowId, filterType, setFilterType, HISTORY_PER_PAGE } = d;

  return (
    <div className="bg-white dark:bg-surface rounded-[2.5rem] border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-50 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><PackageSearch className="w-4 h-4" /></div>
          <h4 className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-widest">{t('movement_history', 'Movement History')}</h4>
        </div>
        <div className="flex bg-gray-100/80 dark:bg-black/75 p-1 rounded-xl border border-gray-200/50 dark:border-white/5 shadow-inner">
          {['ALL', 'IN', 'OUT'].map(opt => {
            const isActive = filterType === opt;
            return (
              <button
                key={opt}
                onClick={() => setFilterType(opt as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${isActive ? 'text-primary' : 'text-gray-600 hover:text-gray-600 dark:hover:text-white'}`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-white dark:bg-[#1f1f1f] rounded-lg shadow-sm border border-gray-200 dark:border-white/10 -z-10 animate-in zoom-in-95" />
                )}
                {opt === 'ALL' ? t('all', 'ALL') : opt === 'IN' ? t('in', 'IN') : t('out', 'OUT')}
              </button>
            );
          })}
        </div>
      </div>

      {totalHistoryPages > 1 && (
        <div className="px-8 py-3 bg-gray-50/50 dark:bg-white/[0.01] border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic">
            {t('page', 'Page')} <span className="text-primary">{historyPage}</span> {t('of', 'of')} {totalHistoryPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={historyPage === 1}
              onClick={() => setHistoryPage(p => p - 1)}
              className="!min-h-0 !p-1.5 !rounded-lg !bg-white dark:!bg-white/5 !border !border-gray-200 dark:!border-white/10 !text-gray-600 hover:!text-primary disabled:opacity-30 !shadow-sm"
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            />
            <Button
              variant="ghost"
              disabled={historyPage === totalHistoryPages}
              onClick={() => setHistoryPage(p => p + 1)}
              className="!min-h-0 !p-1.5 !rounded-lg !bg-white dark:!bg-white/5 !border !border-gray-200 dark:!border-white/10 !text-gray-600 hover:!text-primary disabled:opacity-30 !shadow-sm"
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            />
          </div>
        </div>
      )}

      <div className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
                <th className="px-8 py-4 text-[9px] font-black text-gray-600 uppercase tracking-widest">{t('date_time', 'Date / Time')}</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-600 uppercase tracking-widest text-center">{t('entity_source', 'Entity / Source')}</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-600 uppercase tracking-widest text-center">{t('user', 'User')}</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-600 uppercase tracking-widest text-right">{t('qty_change', 'Qty Change')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {movementHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8">
                    <EmptyState compact icon={<History className="h-full w-full" />} title={t('no_records_found', 'No records found')} className="!py-20" />
                  </td>
                </tr>
              ) : paginatedHistory.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => handleRowClick(h)}
                    className={`group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer active:scale-[0.99] ${clickedRowId === h.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                  >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${h.bg} ${h.color}`}><h.icon className="w-3.5 h-3.5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase leading-tight">
                          {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[8px] text-gray-600 font-bold uppercase">{formatAppTime(h.date, appSettings.timezone)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <p className="text-[9px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tighter">{h.entity}</p>
                    <p className="text-[8px] text-gray-600 font-bold uppercase">{h.label}</p>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{h.user?.split('@')[0] || 'System'}</span>
                    {h.notes && (
                      <p className="text-[7px] text-gray-600 font-medium italic mt-0.5 max-w-[150px] mx-auto truncate">
                        {h.notes}
                      </p>
                    )}
                  </td>
                  <td className={`px-8 py-4 text-right font-black text-xs ${h.color}`}>
                    {h.qty > 0 ? '+' : ''}{h.qty} <span className="text-[9px] opacity-70 ml-1 font-bold">{h.type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-50 dark:divide-white/5">
          {movementHistory.length === 0 ? (
            <EmptyState compact icon={<History className="h-full w-full" />} title={t('no_records_found', 'No records found')} className="!py-20" />
          ) : paginatedHistory.map((h) => (
              <div
                key={h.id}
                onClick={() => handleRowClick(h)}
                className={`p-4 flex flex-col gap-3 active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer ${clickedRowId === h.id ? 'bg-primary/5 border-l-4 border-primary' : ''}`}
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${h.bg} ${h.color}`}><h.icon className="w-3.5 h-3.5" /></div>
                  <div>
                    <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase leading-tight">{new Date(h.date).toLocaleDateString()}</p>
                    <p className="text-[8px] text-gray-600 font-bold uppercase">{formatAppTime(h.date, appSettings.timezone)}</p>
                  </div>
                </div>
                <div className={`text-sm font-black ${h.color}`}>
                  {h.qty > 0 ? '+' : ''}{h.qty} <span className="text-[9px] opacity-70 font-bold uppercase">{h.type}</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-2 rounded-xl">
                <div className="flex flex-col">
                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">{t('reference', 'Reference')}</p>
                  <p className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase truncate max-w-[120px]">{h.entity}</p>
                </div>
                <div className="text-right flex flex-col">
                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">{t('source_user', 'Source / User')}</p>
                  <p className="text-[10px] font-black text-primary uppercase">{h.user?.split('@')[0] || 'System'}</p>
                </div>
              </div>
              {h.notes && (
                <p className="text-[9px] text-gray-600 font-medium italic px-1 line-clamp-2">
                  {h.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {totalHistoryPages > 1 && (
        <div className="px-8 py-4 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic">
            {t('showing', 'Showing')} {(historyPage - 1) * HISTORY_PER_PAGE + 1} {t('to', 'to')} {Math.min(historyPage * HISTORY_PER_PAGE, movementHistory.length)} {t('of', 'of')} {movementHistory.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={historyPage === 1}
              onClick={() => setHistoryPage(p => p - 1)}
              className="!min-h-0 !px-3 !py-1.5 !rounded-xl !bg-white dark:!bg-white/5 !border-gray-200 dark:!border-white/10 !text-[10px] !font-black !tracking-tighter hover:!scale-105 !shadow-sm"
            >
              {t('prev', 'Prev')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={historyPage === totalHistoryPages}
              onClick={() => setHistoryPage(p => p + 1)}
              className="!min-h-0 !px-3 !py-1.5 !rounded-xl !bg-white dark:!bg-white/5 !border-gray-200 dark:!border-white/10 !text-[10px] !font-black !tracking-tighter hover:!scale-105 !shadow-sm"
            >
              {t('next', 'Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
