import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptVisibilitySection(props: ReceiptSettingsFormProps) {
  const { formData, handleChange, canEditSettings } = props;
  return (
    <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-[2rem] border border-gray-200 dark:border-white/5 space-y-3">
      <label className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider block border-b border-gray-250/50 dark:border-white/5 pb-2">
        👁️ Print Visibility
      </label>
      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto scrollbar-hide">
        {[
          { name: 'receiptShowLogo', label: 'Store Logo' },
          { name: 'receiptShowTax', label: 'Tax Breakdown' },
          { name: 'receiptShowDiscount', label: 'Discount Details' },
          { name: 'receiptFontBold', label: 'High Contrast' },
          { name: 'receiptShowStoreName', label: 'Store Name' },
          { name: 'receiptShowStoreAddress', label: 'Store Address' },
          { name: 'receiptShowStorePhone', label: 'Store Phone' },
          { name: 'receiptShowStoreEmail', label: 'Store Email' },
          { name: 'receiptShowCustomerName', label: 'Customer Name' },
          { name: 'receiptShowCustomerPhone', label: 'Customer Phone' },
          { name: 'receiptShowNotes', label: 'Show Notes' },
          { name: 'receiptShowBarcode', label: 'Show Barcode' },
          { name: 'receiptShowDeliveryAddress', label: 'Delivery Address' },
          { name: 'receiptShowQrCode', label: 'QR Code' },
          { name: 'receiptShowFooter', label: 'Show Footer' },
        ].map((item) => (
          <label key={item.name} className="flex items-center gap-2 p-2 bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5">
            <input
              type="checkbox"
              name={item.name}
              checked={(formData as any)[item.name]}
              onChange={handleChange}
              disabled={!canEditSettings}
              className="rounded border-gray-300 text-primary h-3.5 w-3.5 bg-white dark:bg-[#1C1C1C]"
            />
            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
