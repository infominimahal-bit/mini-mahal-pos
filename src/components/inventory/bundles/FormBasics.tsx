import { Package, Tag, Percent, DollarSign } from 'lucide-react';
import { Button } from '../../../shared/ui';
import type { BundleForm } from './formTypes';

interface FormBasicsProps {
  form: BundleForm;
  setForm: (updater: (prev: BundleForm) => BundleForm) => void;
  currencySymbol: string;
  bundleTotal: number;
  onOpenMediaLibrary: () => void;
}

export function FormBasics({ form, setForm, currencySymbol, bundleTotal, onOpenMediaLibrary }: FormBasicsProps) {
  return (
    <>
      {/* Name + Image + Description */}
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">{"Bundle Name *"}</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder={"e.g. Summer Deal, Family Pack, Combo Offer"}
            className="input w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Deal Image</label>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
              {form.image ? (
                <img src={form.image} alt="Deal" className="w-full h-full object-cover" />
              ) : (
                <Package className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                onClick={onOpenMediaLibrary}
              >
                {form.image ? 'Change Image' : 'Upload / Choose Image'}
              </Button>
              {form.image && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForm(p => ({ ...p, image: '' }))}
                  className="!min-h-0 !p-0 !bg-transparent !text-[10px] !font-medium !normal-case !tracking-normal !text-red-500 hover:!text-red-600 text-left"
                >
                  Remove Image
                </Button>
              )}
              <span className="text-[9px] text-gray-400">Recommended: 900×650px</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">{"Description"} ({"Optional"})</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder={"Brief description of the bundle"}
            className="input w-full text-sm"
          />
        </div>
      </div>

      {/* Override Price (Fixed Price Mode) */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{"Pricing Mode *"}</label>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, overridePrice: 0 }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!form.overridePrice ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <Tag className="h-3 w-3" /> {"Discount from Base"}
            </button>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, overridePrice: 1 }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${form.overridePrice > 0 ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <DollarSign className="h-3 w-3" /> {"Set Fixed Price"}
            </button>
          </div>
        </div>
        {form.overridePrice > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-gray-500">{currencySymbol}</span>
            <input
              type="number"
              min={0}
              value={form.overridePrice}
              onChange={e => setForm(p => ({ ...p, overridePrice: Math.max(0, Number(e.target.value)) }))}
              placeholder={"Final Price"}
              className="input flex-1 text-sm text-center font-black"
            />
          </div>
        ) : (
          <>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{"Discount Amount *"}</label>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, discountType: 'percentage' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${form.discountType === 'percentage' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <Percent className="h-3 w-3" /> {"Percentage"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, discountType: 'fixed' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${form.discountType === 'fixed' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <DollarSign className="h-3 w-3" /> {"Fixed"}
                </button>
              </div>
              <input
                type="number"
                min={0}
                max={form.discountType === 'percentage' ? 100 : bundleTotal}
                value={form.discountValue}
                onChange={e => setForm(p => ({ ...p, discountValue: Math.max(0, Math.min(Number(e.target.value), form.discountType === 'percentage' ? 100 : bundleTotal)) }))}
                placeholder={form.discountType === 'percentage' ? '0-100' : "Amount"}
                className="input flex-1 text-sm text-center font-black"
              />
              <span className="text-[11px] font-black text-gray-500">{form.discountType === 'percentage' ? '%' : currencySymbol}</span>
            </div>
          </>
        )}
      </div>

      {/* Receipt Display Option */}
      <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Hide Per-Item Original Prices
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5 leading-relaxed">
              {form.hideItemPrices
                ? '🙈 Hidden — Receipt & POS will only show the deal\'s final price, not individual item prices'
                : '👁️ Visible — Individual original prices shown alongside deal discount on receipt & POS cart'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, hideItemPrices: !p.hideItemPrices }))}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none ${
              form.hideItemPrices
                ? 'bg-violet-500 shadow-lg shadow-violet-500/30'
                : 'bg-gray-300 dark:bg-white/10'
            }`}
            aria-checked={form.hideItemPrices}
            role="switch"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                form.hideItemPrices ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </>
  );
}
