import { Tag } from 'lucide-react';
import { HelpTooltip } from '../../../shared/ui/HelpTooltip';
import type { ProductDetailController } from './useProductDetail';

export function ProductStatus({ d }: { d: ProductDetailController }) {
  const { formData, setFormData, setShowStockIn } = d;

  return (
    <div className="lg:col-span-4 space-y-8">
      <div className="bg-white dark:bg-[#1C1C1C] p-6 sm:p-8 rounded-[3rem] border border-gray-200 dark:border-white/5 shadow-2xl flex flex-col justify-between h-fit">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary/10 text-primary rounded-[1.5rem]"><Tag className="w-6 h-6" /></div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{"Product Status"}</h3>
              <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{"Status & Controls"}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] rounded-[1.5rem] border border-gray-200 dark:border-white/5">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                  {"Active Status"}
                  <HelpTooltip content="Toggles whether this item is selectable or scannable at the POS checkout." />
                </span>
                <span className="text-[9px] font-bold text-gray-600 uppercase">{"Visible in POS"}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer scale-110">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all ${
              formData.productType === 'variable'
                ? 'bg-gray-100/50 dark:bg-white/[0.01] border-gray-200 dark:border-white/5 opacity-60 cursor-not-allowed'
                : 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5'
            }`}>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                  {"Track Stock"}
                  <HelpTooltip content="Maintains physical inventory balance. Unchecking allows infinite sales without stock validation." />
                </span>
                <span className="text-[9px] font-bold text-gray-600 uppercase">
                  {formData.productType === 'variable' ? 'MANAGED BY VARIATIONS' : 'Inventory Control'}
                </span>
              </div>
              <label className={`relative inline-flex items-center scale-110 ${formData.productType === 'variable' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.productType === 'variable' ? true : formData.trackInventory}
                  disabled={formData.productType === 'variable'}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({ ...formData, trackInventory: checked });
                    if (checked) setShowStockIn(true);
                  }}
                />
                <div className={`w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${formData.productType === 'variable' ? 'peer-checked:bg-gray-400' : 'peer-checked:bg-primary'}`}></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] rounded-[1.5rem] border border-gray-200 dark:border-white/5">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center">
                  {"Service Item"}
                  <HelpTooltip content="Flags item as labor or consultation. Auto-disables stock tracking and ignores low stock warnings." />
                </span>
                <span className="text-[9px] font-bold text-gray-600 uppercase">{"No Stock Tracking"}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer scale-110">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isService}
                  onChange={(e) => setFormData({ ...formData, isService: e.target.checked, trackInventory: e.target.checked ? false : formData.trackInventory })}
                />
                <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] rounded-[1.5rem] border border-gray-200 dark:border-white/5">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center">
                  {"Require Serial/IMEI"}
                  <HelpTooltip content="Forces scanner or keyboard prompt at POS for unique serial number / IMEI registration." />
                </span>
                <span className="text-[9px] font-bold text-gray-600 uppercase">{"Prompt on POS"}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer scale-110">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.requireSerial}
                  onChange={(e) => setFormData({ ...formData, requireSerial: e.target.checked })}
                />
                <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
