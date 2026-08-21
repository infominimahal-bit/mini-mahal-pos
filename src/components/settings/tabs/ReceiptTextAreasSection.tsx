import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptTextAreasSection(props: ReceiptSettingsFormProps) {
  const { formData, handleChange, canEditSettings } = props;
  return (
    <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-[2rem] border border-gray-200 dark:border-white/5 space-y-4">
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest ml-1">Header Welcome Text</label>
        <textarea
          name="receiptHeader"
          value={formData.receiptHeader}
          onChange={handleChange}
          disabled={!canEditSettings}
          className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-2 px-3 transition-all text-xs font-bold text-gray-900 dark:text-white font-mono resize-none"
          rows={2}
          placeholder="Welcome to our store..."
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest ml-1">Footer / Terms Text</label>
        <textarea
          name="receiptFooter"
          value={formData.receiptFooter}
          onChange={handleChange}
          disabled={!canEditSettings}
          className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-2 px-3 transition-all text-xs font-bold text-gray-900 dark:text-white font-mono resize-none"
          rows={2}
          placeholder="Thank you for shopping!"
        />
      </div>
    </div>
  );
}
