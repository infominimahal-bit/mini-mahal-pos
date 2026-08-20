import { Button } from '../../../shared/ui';
import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptMarginCalibrationSection(props: ReceiptSettingsFormProps) {
  const { formData, setFormData, handleChange, handleResetCalibration, canEditSettings } = props;
  return (
    <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-[2rem] border border-gray-200 dark:border-white/5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-2">
        <label className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider block">
          🎯 Hardware Calibration (mm)
        </label>
        <Button
          variant="ghost"
          type="button"
          onClick={handleResetCalibration}
          className="!min-h-0 !p-0 !text-[9px] !font-black !text-primary dark:!text-emerald-400 hover:!text-primary !hover:bg-transparent"
        >
          Reset
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase">
            <span>Margin Top</span>
            <span className="font-black text-[#10B981]">{formData.receiptPaddingTop ?? 0}mm</span>
          </div>
          <input type="range" min="-60" max="60" step="1"
            value={formData.receiptPaddingTop ?? 0}
            onChange={(e) => setFormData(p => ({ ...p, receiptPaddingTop: parseInt(e.target.value) }))}
            disabled={!canEditSettings}
            className="w-full h-1 bg-gray-250 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase">
            <span>Margin Bottom</span>
            <span className="font-black text-[#10B981]">{formData.receiptPaddingBottom ?? 0}mm</span>
          </div>
          <input type="range" min="-60" max="60" step="1"
            value={formData.receiptPaddingBottom ?? 0}
            onChange={(e) => setFormData(p => ({ ...p, receiptPaddingBottom: parseInt(e.target.value) }))}
            disabled={!canEditSettings}
            className="w-full h-1 bg-gray-250 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase">
            <span>Margin Left</span>
            <span className="font-black text-[#10B981]">{formData.receiptPaddingLeft ?? 0}mm</span>
          </div>
          <input type="range" min="-45" max="45" step="1"
            value={formData.receiptPaddingLeft ?? 0}
            onChange={(e) => setFormData(p => ({ ...p, receiptPaddingLeft: parseInt(e.target.value) }))}
            disabled={!canEditSettings}
            className="w-full h-1 bg-gray-250 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase">
            <span>Margin Right</span>
            <span className="font-black text-[#10B981]">{formData.receiptPaddingRight ?? 0}mm</span>
          </div>
          <input type="range" min="-45" max="45" step="1"
            value={formData.receiptPaddingRight ?? 0}
            onChange={(e) => setFormData(p => ({ ...p, receiptPaddingRight: parseInt(e.target.value) }))}
            disabled={!canEditSettings}
            className="w-full h-1 bg-gray-250 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-200/50 dark:border-white/5">
          <div className="flex justify-between items-center text-[9px] font-black text-primary dark:text-emerald-400 uppercase tracking-wider">
            <span>🚀 Global Shift (Everything)</span>
            <span className="text-[#10B981]">{formData.receiptOffsetX ?? 0}mm</span>
          </div>
          <input type="range" min="-40" max="40" step="1"
            name="receiptOffsetX"
            value={formData.receiptOffsetX ?? 0}
            onChange={(e) => handleChange({ target: { name: 'receiptOffsetX', value: parseInt(e.target.value) } } as any)}
            disabled={!canEditSettings}
            className="w-full h-1 bg-gray-250 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-200/50 dark:border-white/5">
          <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase">
            <span>Header Indent</span>
            <span className="font-black text-blue-500">{formData.receiptHeaderOffsetX ?? 0}mm</span>
          </div>
          <input type="range" min="-30" max="30" step="1"
            name="receiptHeaderOffsetX"
            value={formData.receiptHeaderOffsetX ?? 0}
            onChange={(e) => handleChange({ target: { name: 'receiptHeaderOffsetX', value: parseInt(e.target.value) } } as any)}
            disabled={!canEditSettings}
            className="w-full h-1 bg-gray-250 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500/50"
          />
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-200/50 dark:border-white/5">
          <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase">
            <span>Footer Indent</span>
            <span className="font-black text-primary">{formData.receiptFooterOffsetX ?? 0}mm</span>
          </div>
          <input type="range" min="-30" max="30" step="1"
            name="receiptFooterOffsetX"
            value={formData.receiptFooterOffsetX ?? 0}
            onChange={(e) => handleChange({ target: { name: 'receiptFooterOffsetX', value: parseInt(e.target.value) } } as any)}
            disabled={!canEditSettings}
            className="w-full h-1 bg-gray-250 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500/50"
          />
        </div>
      </div>
    </div>
  );
}
