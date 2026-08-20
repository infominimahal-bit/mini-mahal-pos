import { Package } from 'lucide-react';
import { PurchaseHistoryCard, PurchaseHistoryMobileCard } from './PurchaseHistoryCard';
import { PurchaseRecord, Product } from '../../types';
import { EmptyState, Pagination } from '../../shared/ui';

interface PurchaseHistoryTableProps {
  paginatedRecords: PurchaseRecord[];
  appProducts: Product[];
  currency: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: (val: number | ((prev: number) => number)) => void;
  setPageSize: (val: number) => void;
  handleDeleteRecord: (record: PurchaseRecord) => void;
}

export function PurchaseHistoryTable({
  paginatedRecords,
  appProducts,
  currency,
  currentPage,
  totalPages,
  itemsPerPage,
  setCurrentPage,
  setPageSize,
  handleDeleteRecord,
}: PurchaseHistoryTableProps) {
  return (
    <div className="bg-white dark:bg-surface rounded-[2.5rem] border border-gray-200 dark:border-white/5 overflow-hidden shadow-2xl">
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
              <th className="p-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">{"Date & Identity"}</th>
              <th className="p-6 text-[10px] font-black text-gray-600 uppercase tracking-widest text-center">{"Procurement Details"}</th>
              <th className="p-6 text-[10px] font-black text-gray-600 uppercase tracking-widest text-center">{"Financial Impact"}</th>
              <th className="p-6 text-[10px] font-black text-gray-600 uppercase tracking-widest text-right">{"Admin Control"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/5">
            {paginatedRecords.length > 0 ? paginatedRecords.map((record) => (
              <PurchaseHistoryCard
                key={record.id}
                record={record}
                appProducts={appProducts}
                currency={currency}
                onDelete={handleDeleteRecord}
              />
            )) : (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                  <EmptyState
                    className="!p-0 opacity-30"
                    icon={<Package className="h-full w-full" />}
                    title={"No Procurement Records Found"}
                    subtext={"Adjust your filters or perform system actions"}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden p-4 space-y-3">
        {paginatedRecords.length > 0 ? paginatedRecords.map((record) => (
          <PurchaseHistoryMobileCard
            key={record.id}
            record={record}
            appProducts={appProducts}
            currency={currency}
          />
        )) : (
          <EmptyState compact className="!py-10 opacity-30" icon={<Package className="h-full w-full" />} title="No Records" />
        )}
      </div>

      <div className="p-6 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Page {currentPage} of {totalPages}</p>
        </div>
        <Pagination mode="prevNext" page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
          pageSize={itemsPerPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
