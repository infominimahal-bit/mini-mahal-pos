import { Printer } from 'lucide-react';
import { ReceiptSettingsForm } from './ReceiptSettingsForm';
import { ReceiptSettingsPreview } from './ReceiptSettingsPreview';

export function ReceiptSettings({
  formData,
  setFormData,
  handleChange,
  handleInstantUpdate,
  handleResetCalibration,
  appSettings,
  profile,
  setCompletedSale,
  setShowReceipt,
  canEditSettings,
}: import('./types').SettingsTabProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-50 dark:border-white/5">
        <div className="w-10 h-10 bg-[#10B981]/10 rounded-xl flex items-center justify-center">
          <Printer className="w-5 h-5 text-[#10B981]" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Receipt Design</h2>
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Branding & Printing Orchestration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <ReceiptSettingsForm
          formData={formData}
          setFormData={setFormData}
          handleChange={handleChange}
          handleInstantUpdate={handleInstantUpdate}
          handleResetCalibration={handleResetCalibration}
          canEditSettings={canEditSettings}
        />
        <ReceiptSettingsPreview
          formData={formData}
          appSettings={appSettings}
          profile={profile}
          setCompletedSale={setCompletedSale}
          setShowReceipt={setShowReceipt}
        />
      </div>
    </section>
  );
}
