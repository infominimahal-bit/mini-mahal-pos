import React, { useState, useEffect } from 'react';
import { Sale, RefundRequest } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { useApp } from '../../context/SupabaseAppContext';
import { useSettingsStore } from '../../stores';
import { Button, Select } from '../../shared/ui';
import { paymentModesService } from '../../lib/services/paymentsService';

interface RefundSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onConfirmRefund: (request: RefundRequest) => Promise<void>;
  isProcessing: boolean;
}

export default function RefundSaleModal({ isOpen, onClose, sale, onConfirmRefund, isProcessing }: RefundSaleModalProps) {
  const settings = useSettingsStore(s => s.settings);
  const [modes, setModes] = useState<{ id: string; name: string }[]>([]);
  // Default refund method = original sale method (fall back to cash for split/cheque)
  const defaultMethod = (['cash', 'card', 'online', 'digital'].includes(sale.paymentMethod))
    ? sale.paymentMethod
    : 'cash';
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<string>(defaultMethod);

  useEffect(() => {
    paymentModesService.getAll().then(list => {
      setModes(list.map((m: any) => ({ id: m.id, name: m.name })));
      const ids = list.map((m: any) => m.id);
      if (!ids.includes(method)) setMethod(ids.includes(defaultMethod) ? defaultMethod : (ids[0] || 'cash'));
    }).catch(() => setModes([{ id: 'cash', name: 'Cash' }, { id: 'card', name: 'Card' }, { id: 'online', name: 'Online Wallet' }]));
  }, [sale.id]);

  // Partial refunds are removed: a refund is ALWAYS a full refund of the remaining
  // balance. This keeps the wallet reversal exact (the real amount) — never kam/ziyada.
  const totalAvailableToRefund = sale.total - (sale.refundedAmount || 0);

  const handleConfirm = () => {
    onConfirmRefund({
      type: 'full',
      items: [],
      totalRefundAmount: totalAvailableToRefund,
      reason: reason.trim() || undefined,
      method,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Refund Sale"
      maxWidth="lg"
      showClose={!isProcessing}
    >
      <div className="p-4 space-y-4">
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 p-3 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            Refunding will restore stock for ALL items and adjust revenue reports. This is a full refund and cannot be undone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Refund Via Wallet</label>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="!py-2.5"
            >
              {modes.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Reason (Optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged item, wrong size..."
              className="input w-full text-[13px] font-medium py-2.5 px-3 bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-dark-700 flex justify-between items-center">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Refund Amount</p>
          <p className="text-xl font-black text-rose-600">
            {formatCurrency(totalAvailableToRefund, settings?.currency || 'Rs')}
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-dark-700 flex gap-2">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isProcessing}
          className="flex-1 !py-3 !rounded-xl !font-bold !bg-gray-100 dark:!bg-dark-700 !text-gray-700 dark:!text-gray-300 disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="flex-1 !py-3 !rounded-xl !font-bold !shadow-lg disabled:opacity-50 !bg-rose-500 !shadow-rose-500/20"
        >
          <RotateCcw className={`h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`} />
          {isProcessing ? 'Processing...' : 'Confirm Refund'}
        </Button>
      </div>
    </Modal>
  );
}
