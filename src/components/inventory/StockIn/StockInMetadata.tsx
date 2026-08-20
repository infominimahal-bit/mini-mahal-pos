import React from 'react';
import { ToggleSwitch } from '../../../shared/ui';

interface Props {
  batchData: { date: string; notes: string; paidAmount: number; paymentMethod: string };
  setBatchData: React.Dispatch<React.SetStateAction<{ date: string; notes: string; paidAmount: number; paymentMethod: string }>>;
  recordAsSupplierBill: boolean;
  setRecordAsSupplierBill: (val: boolean) => void;
  t: (key: string, fallback?: string) => string;
}

export function StockInMetadata({ batchData, setBatchData, recordAsSupplierBill, setRecordAsSupplierBill, t }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-[11px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
        <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
        {t('sourcing_metadata', 'Sourcing Metadata')}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('transmission_date', 'Transmission Date')}</label>
          <input
            type="date"
            value={batchData.date}
            onChange={(e) => setBatchData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none p-4 rounded-xl text-[11px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('internal_ref', 'Internal Ref')}</label>
          <input
            value={batchData.notes}
            onChange={(e) => setBatchData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none p-4 rounded-xl text-[11px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
            placeholder="PO_ID..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#f8f9fa] dark:bg-black/75 p-4 rounded-xl">
        <div className="flex-1">
          <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('record_supplier_bill', 'Record as Supplier Bill')}</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">{t('supplier_bill_desc', 'Creates payable in supplier ledger')}</p>
        </div>
        <ToggleSwitch
          checked={recordAsSupplierBill}
          onChange={setRecordAsSupplierBill}
          size="md"
          color="bg-primary"
        />
      </div>
    </div>
  );
}
