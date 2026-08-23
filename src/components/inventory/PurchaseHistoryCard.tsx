import React from 'react';
import { Trash2, Hash, Tag } from 'lucide-react';
import { PurchaseRecord, Product } from '../../types';
import { useUiStore } from '../../stores';
import { Badge } from '../../shared/ui';
import { formatCurrency } from '../../lib/currencies';

interface PurchaseHistoryCardProps {
  record: PurchaseRecord;
  appProducts: Product[];
  currency: string;
  onDelete: (record: PurchaseRecord) => void;
}

export function PurchaseHistoryCard({ record, appProducts, currency, onDelete }: PurchaseHistoryCardProps) {
  const handleRowClick = () => {
    const isRetail = record.type === 'Sale' || record.type === 'Return' || record.notes?.includes('Invoice #');
    if (isRetail) {
      const ref = record.notes?.match(/#([A-Z0-9-]+)/)?.[1] || record.id.slice(-6).toUpperCase();
      useUiStore.getState().setPendingReturnTab('purchases');
      useUiStore.getState().setPendingSearch(ref);
      const event = new CustomEvent('navigate', { detail: 'transactions' });
      window.dispatchEvent(event);
    } else if (record.productId) {
      const p = appProducts.find(prod => prod.id === record.productId);
      if (p) {
        useUiStore.getState().setPendingReturnTab('purchases');
        window.dispatchEvent(new CustomEvent('open-product-hub', { detail: p.id }));
      }
    }
  };

  return (
    <tr
      key={record.id}
      onClick={handleRowClick}
      className="group hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer"
    >
      <td className="p-6">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl flex flex-col items-center justify-center border ${record.type === 'Return' ? 'bg-amber-500/10 border-amber-500/20' :
            record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'bg-rose-500/10 border-rose-500/20' :
              'bg-gray-100 dark:bg-white/5 border-white/5'
            }`}>
            <p className={`text-[10px] font-black opacity-80 ${record.type === 'Return' ? 'text-amber-500' :
              record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'text-rose-500' :
                'text-primary'
              }`}>{new Date(record.date || Date.now()).toLocaleDateString('en-US', { month: 'short' })}</p>
            <p className="text-sm font-black text-gray-900 dark:text-white leading-none">{new Date(record.date || Date.now()).getDate()}</p>
          </div>
          <div className="min-w-0">
            {(() => {
              const product = appProducts.find(p => p.id === record.productId);
              const displayName = record.productName && record.productName !== 'Unknown Product'
                ? record.productName
                : (product?.name || 'Unknown Product');
              const displaySku = record.sku && record.sku !== 'N/A'
                ? record.sku
                : (product?.sku || 'N/A');

              return (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[200px]">
                      {displayName}
                    </p>
                    {record.type === 'Return' && (
                      <Badge tone="warning" variant="solid" size="sm" className="!text-[7px] !px-1.5 !py-0.5 !rounded animate-pulse">{"RETURN"}</Badge>
                    )}
                    {(record.type?.includes('Reversal') || record.type?.includes('Deletion')) && (
                      <Badge tone="danger" variant="solid" size="sm" className="!text-[7px] !px-1.5 !py-0.5 !rounded">{"DELETED"}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-gray-600 flex items-center gap-1 uppercase">
                      <Hash className="h-2.5 w-2.5" /> {displaySku}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full" />
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${record.supplier === 'SALE RETURN' ? 'text-amber-500' :
                      record.supplier === 'SYSTEM REVERSAL' ? 'text-rose-500' :
                        'text-primary dark:text-primary'
                      }`}>
                      {record.supplier || "DIRECT ENTRY"}
                    </span>
                    {record.addedBy && (
                      <>
                        <span className="w-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full" />
                        <span className="text-[9px] font-medium text-gray-500 uppercase tracking-tighter">
                          {"BY"} {record.addedBy}
                        </span>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </td>
      <td className="p-6 text-center">
        <div className="inline-flex flex-col items-center">
          <span className={`text-xs font-black mb-1 ${record.type === 'Return' ? 'text-amber-500' :
            record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'text-rose-500' :
              'text-gray-900 dark:text-white'
            }`}>
            {record.quantity > 0 ? '+' : ''}{record.quantity} <span className="text-[10px] text-gray-600">{"PCS"}</span>
          </span>
          <div className="flex items-center gap-2 p-1 px-2 rounded-lg bg-gray-100/50 dark:bg-white/5">
            <Tag className={`h-2.5 w-2.5 ${record.type === 'Return' ? 'text-amber-500' :
              record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'text-rose-500' :
                'text-orange-500'
              }`} />
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">{"Cost"}: {formatCurrency(record.costPrice || 0, currency)}</span>
          </div>
        </div>
      </td>
      <td className="p-6 text-center">
        <div className="inline-flex flex-col items-center gap-1">
          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{"Total Impact"}</p>
          <p className={`text-sm font-black ${record.type === 'Return' ? 'text-amber-500' :
            record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'text-rose-500' :
              'text-primary dark:text-emerald-400'
            }`}>{formatCurrency((record.quantity || 0) * (record.costPrice || 0), currency)}</p>
          <p className="text-[9px] font-bold text-gray-600 uppercase opacity-50">{"SRP: "}{formatCurrency(record.retailPrice || 0, currency)}</p>
        </div>
      </td>
      <td className="p-6 text-right">
        <div className="flex justify-end lg:opacity-0 group-hover:opacity-100 transition-opacity">
          {record.type !== 'Return' && !record.type?.includes('Reversal') && (
            <button
              onClick={() => onDelete(record)}
              className="p-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl hover:scale-110 transition-transform"
              title="Delete Record"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PurchaseHistoryMobileCard({ record, _appProducts, currency }: Omit<PurchaseHistoryCardProps, 'onDelete'>) {
  return (
    <div
      key={record.id}
      className="p-4 bg-gray-50 dark:bg-black/20 rounded-[2rem] border border-gray-200 dark:border-white/5 active:scale-95 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex flex-col items-center justify-center border ${record.type === 'Return' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white dark:bg-white/5 border-white/5'
            }`}>
            <p className="text-[8px] font-black text-gray-600 uppercase">{new Date(record.date || Date.now()).toLocaleDateString('en-US', { month: 'short' })}</p>
            <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{new Date(record.date || Date.now()).getDate()}</p>
          </div>
          <div>
            <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[150px]">{record.productName}</p>
            <p className="text-[9px] font-bold text-gray-600 uppercase">@{record.sku}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-black ${record.quantity > 0 ? 'text-primary' : 'text-amber-500'}`}>{record.quantity > 0 ? '+' : ''}{record.quantity} PCS</p>
          <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{record.supplier || 'Direct'} {record.addedBy ? `| By ${record.addedBy}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-200 dark:border-white/5">
        <div>
          <p className="text-[8px] font-black text-gray-600 uppercase mb-0.5">Financial Impact</p>
          <p className="text-xs font-black text-primary dark:text-emerald-400">{formatCurrency((record.quantity || 0) * (record.costPrice || 0), currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-gray-600 uppercase mb-0.5">Unit Cost</p>
          <p className="text-xs font-black text-gray-900 dark:text-white">{formatCurrency(record.costPrice || 0, currency)}</p>
        </div>
      </div>
    </div>
  );
}
