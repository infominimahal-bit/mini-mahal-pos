import { HelpTooltip } from '../../../shared/ui/HelpTooltip';
import type { ProductFormFieldsProps } from './ProductFormFieldsMain';

export function PricingStockFields(props: ProductFormFieldsProps) {
  const { formData, onFieldChange } = props;

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
          <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
          E-Store Visibility & Sorting
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 cursor-pointer group p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-500/20 transition-all hover:bg-amber-100 dark:hover:bg-amber-900/20">
            <input
              type="checkbox"
              name="isFeatured"
              checked={formData.isFeatured}
              onChange={onFieldChange}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-amber-600"
            />
            <div>
              <div className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center">
                {"Featured"}
              </div>
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-0.5">Sorts to top of E-Store</div>
            </div>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
          <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
          {"financials_inventory"}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center">
              {"selling_price"}
              <HelpTooltip content="The retail price charged to customers at checkout. Tax calculations will be applied on top of or inclusive of this figure." />
            </label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={onFieldChange}
              className="w-full bg-white dark:bg-black/75 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white text-base font-black rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center">
              {"cost_price"}
              <HelpTooltip content="The wholesale acquisition cost. Used strictly for calculating Cost of Goods Sold (COGS), gross profit, and valuation." />
            </label>
            <input
              type="text"
              name="cost"
              value={formData.cost}
              onChange={onFieldChange}
              className="w-full bg-white dark:bg-black/75 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white text-base font-black rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className={`flex items-start gap-3 cursor-pointer group p-3 rounded-xl border transition-all ${formData.productType === 'variable'
              ? 'bg-gray-100/50 dark:bg-white/5 border-gray-200 dark:border-white/5 opacity-60 cursor-not-allowed'
              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:!bg-white/10'
            }`}>
            <input
              type="checkbox"
              name="trackInventory"
              checked={formData.productType === 'variable' ? true : formData.trackInventory}
              onChange={onFieldChange}
              disabled={formData.productType === 'variable'}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary disabled:opacity-50"
            />
            <div>
              <div className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center">
                {"enable_active_tracking"}
                <HelpTooltip content="Maintains real-time stock balances across sales and returns. Disabling this treats the item as having infinite supply." />
              </div>
              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">
                {formData.productType === 'variable' ? 'MANAGED BY VARIATIONS' : "track_stock_alert"}
              </div>
            </div>
          </label>

          {formData.trackInventory && formData.productType === 'simple' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center">
                  {"initial_stock"}
                  <HelpTooltip content="The starting physical inventory count available on hand when creating this item." />
                </label>
                <input
                  type="text"
                  name="stock"
                  value={formData.stock}
                  onChange={onFieldChange}
                  className="w-full bg-white dark:bg-black/75 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white text-base font-black rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center">
                  {"low_stock_alert"}
                  <HelpTooltip content="Threshold at which item appears on the Low Stock dashboard widget and reorder reports." />
                </label>
                <input
                  type="text"
                  name="minStock"
                  value={formData.minStock}
                  onChange={onFieldChange}
                  className="w-full bg-white dark:bg-black/75 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white text-base font-black rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
