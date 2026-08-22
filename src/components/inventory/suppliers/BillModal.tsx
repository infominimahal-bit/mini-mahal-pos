import React from 'react';
import { Button, ToggleSwitch } from '../../../shared/ui';
import { Modal } from '../../../shared/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  billAmount: string;
  setBillAmount: (v: string) => void;
  billNote: string;
  setBillNote: (v: string) => void;
  isBillManualOverride: boolean;
  setIsBillManualOverride: (v: boolean) => void;
  submitBill: () => void;
  formLoading: boolean;
}

export function BillModal({
  isOpen, onClose, billAmount, setBillAmount, billNote, setBillNote,
  isBillManualOverride, setIsBillManualOverride, submitBill, formLoading
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={'RECORD MANUAL BILL'}
      subtitle={'ADD MANUAL INVOICE AMOUNT TO LEDGER'}
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 sm:flex-none !px-4 sm:!px-6 !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[10px] !font-black !rounded-2xl !text-gray-600 !border-gray-200 dark:!border-white/10 shrink-0"
          >
            {'Cancel'}
          </Button>
          <Button
            variant="danger"
            onClick={submitBill}
            disabled={formLoading}
            className="flex-1 sm:flex-none sm:min-w-[200px] !px-4 sm:!px-6 !py-2.5 sm:!py-3.5 !bg-rose-500 hover:!bg-rose-600 !text-[9px] sm:!text-[11px] !font-black !rounded-2xl !shadow-lg !shadow-rose-500/20"
          >
            {formLoading ? 'Recording...' : 'Record Bill'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-4 rounded-2xl text-center">
          <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest">{t('this_will_increase_balance', 'THIS WILL INCREASE THE OUTSTANDING BALANCE')}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">{t('bill_amount', 'Bill Amount *')}</label>
            <input
              type="number"
              step="0.01"
              className="w-full bg-gray-50 dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              placeholder="0.00"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">{t('note_reference', 'Note / Reference')}</label>
            <input
              type="text"
              className="w-full bg-gray-50 dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              placeholder="e.g. Invoice #9988"
              value={billNote}
              onChange={(e) => setBillNote(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3.5 rounded-xl">
            <div className="flex-1">
              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">{t('manual_override', 'Manual Override')}</p>
              <p className="text-[9px] text-amber-600/70 dark:text-amber-500/60 mt-0.5">{t('override_desc', 'Admin amount correction — logged')}</p>
            </div>
            <ToggleSwitch checked={isBillManualOverride} onChange={setIsBillManualOverride} color="bg-amber-500" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
