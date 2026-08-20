import { Layers } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { useTranslation } from '../../hooks/useTranslation';

interface TransactionSummaryProps {
  transaction: any;
  appSettings: any;
  showDiscount: boolean;
}

export function TransactionSummary({ transaction, appSettings, showDiscount }: TransactionSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-gray-50 dark:bg-white/[0.03] rounded-2xl space-y-2">
      {transaction.notes && (
        <div className="pb-2 mb-2 border-b border-gray-200 dark:border-white/10">
          <p className="text-[8px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">{"Internal Memo"}</p>
          <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 italic">"{transaction.notes}"</p>
        </div>
      )}

      {transaction.splitPayments && transaction.splitPayments.length > 0 && (
        <div className="pb-2 mb-2 border-b border-gray-200 dark:border-white/10">
          <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1.5 flex items-center gap-1"><Layers className="w-2.5 h-2.5" /> {"Split Payment Breakdown"}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {transaction.splitPayments.map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-[9px] font-black uppercase">
                <span className="text-gray-500">{t(p.method, p.method)}</span>
                <span className="text-gray-700 dark:text-gray-300">{formatCurrency(p.amount, appSettings.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDiscount && (
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-600">
          <span>{"Subtotal"}</span>
          <span className="text-gray-900 dark:text-white tabular-nums">{formatCurrency(transaction.subtotal, appSettings.currency)}</span>
        </div>
      )}

      {showDiscount && transaction.discountAmount > 0 && (
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-rose-500">
          <span className="flex items-center gap-1">Discount</span>
          <span className="tabular-nums">-{formatCurrency(transaction.discountAmount, appSettings.currency)}</span>
        </div>
      )}
      {transaction.taxAmount > 0 && (
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-600">
          <span>{"Tax"}</span>
          <span className="text-gray-900 dark:text-white tabular-nums">+{formatCurrency(transaction.taxAmount, appSettings.currency)}</span>
        </div>
      )}

      {(() => {
        const dcExtra = transaction.extraCharges?.find((c: any) => Number(c.amount) > 0 && c.name?.toUpperCase() === 'DC');
        if (dcExtra) {
          return (
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-600">
              <span>Delivery Charges (DC)</span>
              <span className="tabular-nums">+{formatCurrency(dcExtra.amount, appSettings.currency)}</span>
            </div>
          );
        }
        if (transaction.deliveryFee != null && transaction.deliveryFee > 0) {
          return (
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-600">
              <span>Delivery Charges (DC)</span>
              <span className="tabular-nums">+{formatCurrency(transaction.deliveryFee, appSettings.currency)}</span>
            </div>
          );
        }
        if (transaction.extraCharges && transaction.extraCharges.length > 0) {
          return transaction.extraCharges.map((charge: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-600">
              <span>{charge.name || "Extra Charge"}</span>
              <span className="tabular-nums">+{formatCurrency(charge.amount, appSettings.currency)}</span>
            </div>
          ));
        }
        return null;
      })()}

      {transaction.refundedAmount > 0 && (
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-rose-500">
          <span>Refunded Amount</span>
          <span className="tabular-nums">-{formatCurrency(transaction.refundedAmount, appSettings.currency)}</span>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-white/10">
        <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">{"Net Total"}</span>
        <div className="flex flex-col items-end">
          <span className={`text-xs tabular-nums ${transaction.refundedAmount > 0 ? 'line-through text-gray-400 font-bold' : 'text-lg font-black text-primary'}`}>
            {formatCurrency(transaction.total, appSettings.currency)}
          </span>
          {transaction.refundedAmount > 0 && (
            <span className="text-lg font-black text-primary tabular-nums leading-none mt-0.5">
              {formatCurrency(transaction.total - transaction.refundedAmount, appSettings.currency)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
