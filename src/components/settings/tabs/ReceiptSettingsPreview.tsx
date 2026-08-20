import { Printer } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { ReceiptPreview } from '../ReceiptPreview';
import type { AppSettings } from '../../../types';
import type { SettingsTabProps } from './types';

export function ReceiptSettingsPreview({
  formData,
  appSettings,
  profile,
  setCompletedSale,
  setShowReceipt,
}: SettingsTabProps) {
  return (
    <div className="lg:col-span-3 lg:sticky lg:top-4 bg-gray-100 dark:bg-white/[0.03] rounded-[2.5rem] p-4 border border-gray-200 dark:border-white/5 flex flex-col items-center">
      <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
        Live Preview
      </h3>
      <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl p-3 shadow-xl overflow-hidden w-full max-w-[240px] border border-gray-200 dark:border-white/5">
        <ReceiptPreview settings={{
          ...appSettings,
          ...formData,
          taxRate: parseFloat(formData.taxRate) || 0,
          receiptFontScale: parseFloat(formData.receiptFontScale) || 1,
          invoiceCounter: parseInt(formData.invoiceCounter) || 1000,
        } as unknown as AppSettings} />
      </div>

      <Button
        type="button"
        onClick={() => {
          const mockSale = {
            id: 'TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            invoiceNumber: (formData.invoicePrefix || 'INV') + '-' + formData.invoiceCounter,
            timestamp: new Date(),
            items: [
              { product: { id: 'p1', name: 'Sample Item 01 (Premium)', price: 1250 }, quantity: 2 },
              { product: { id: 'p2', name: 'Standard Utility Item', price: 450 }, quantity: 1 }
            ],
            subtotal: 2950,
            discountAmount: 0,
            taxAmount: 2950 * (parseFloat(formData.taxRate) / 100),
            total: 2950 * (1 + parseFloat(formData.taxRate) / 100),
            paymentMethod: 'cash' as const,
            cashier: profile?.name?.split(' ')[0] || 'ADMIN',
            saleType: 'retail' as const,
            saleDate: new Date().toLocaleDateString('en-CA')
          };
          setCompletedSale(mockSale as any);
          setShowReceipt(true);
        }}
        icon={<Printer className="w-3.5 h-3.5" />}
        className="mt-4 w-full !py-3 !rounded-xl !text-[9px] !font-black !tracking-[0.2em] !gap-1.5 shadow-emerald-500/10 hover:!bg-emerald-700"
      >
        Test Print
      </Button>
    </div>
  );
}
