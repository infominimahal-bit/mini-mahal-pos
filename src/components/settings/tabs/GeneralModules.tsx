import {
  Sliders,
  Store,
  ShoppingBag,
  Keyboard,
  Volume2,
  VolumeX,
  PlusCircle,
  AlertCircle,
  Layout,
} from 'lucide-react';
import { Button, ToggleSwitch, Select } from '../../../shared/ui';
import type { SettingsTabProps } from './types';

export function GeneralModules({
  formData,
  setFormData,
  handleChange,
  handleInstantUpdate,
  t,
  play,
}: SettingsTabProps) {
  return (
    <div className="lg:col-span-4 space-y-6">
      {/* User Experience Theme */}
      <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-white/[0.02] rounded-[2rem] border border-gray-200 dark:border-white/5 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-white/5">
          <div className="p-2.5 bg-white dark:bg-white/10 rounded-xl shadow-sm">
            <Layout className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t("experience", "Experience")}</h3>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{t("experience_subtitle", "Personalize your workspace")}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">{t("app_theme", "App Theme")}</label>
            <div className="grid grid-cols-3 gap-2 bg-white dark:bg-black/25 p-1 rounded-xl border border-gray-200 dark:border-white/5">
              {(['light', 'dark', 'auto'] as const).map((tVal) => (
                <Button
                  key={tVal}
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, theme: tVal }));
                    handleInstantUpdate('theme', tVal);
                  }}
                  className={`!min-h-0 !gap-0 !py-2 !text-[9px] !tracking-widest !rounded-lg !shadow-none ${formData.theme === tVal
                    ? '!bg-[#10B981] !text-white !shadow-md'
                    : '!text-gray-500 hover:!text-gray-900 dark:hover:!text-white'
                    }`}
                >
                  {tVal === 'light' ? t("theme_light", "Light") : (tVal === 'dark' ? t("theme_dark", "Dark") : tVal)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">{t("interface_mode", "Interface Mode")}</label>
            <Select
              name="interfaceMode"
              value={formData.interfaceMode || 'touch'}
              onChange={(e) => {
                handleChange(e);
                handleInstantUpdate('interfaceMode', e.target.value);
              }}
              className="!text-xs !font-bold !py-2"
            >
              <option value="touch">{t("touch_friendly", "Touch Friendly (POS Optimized)")}</option>
              <option value="traditional">{t("traditional", "Traditional (Keyboard Focused)")}</option>
            </Select>
          </div>
        </div>
      </div>

      {/* System Modules Toggles */}
      <div className="p-4 sm:p-6 bg-gradient-to-br from-violet-50/40 to-emerald-50/30 dark:from-violet-900/5 dark:to-emerald-900/5 rounded-[2rem] border border-violet-200/30 dark:border-violet-900/20 space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-violet-200/40 dark:border-violet-900/20">
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/20 rounded-xl flex items-center justify-center">
            <Sliders className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t("system_modules", "System Modules")}</h3>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{t("system_modules_subtitle", "Enable or disable advanced features")}</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Retail Mode Toggle */}
          <label className="flex items-center justify-between p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer group transition-all">
            <div className="flex items-center gap-3">
              <Store className="w-4 h-4 text-gray-500 group-hover:text-violet-500 transition-colors" />
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block leading-none">{t("retail_sales", "Retail Sales")}</span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider block mt-1">{t("retail_sales_subtitle", "B2C direct sales")}</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              color="bg-violet-500"
              checked={formData.retailEnabled}
              onChange={(v) => handleInstantUpdate('retailEnabled', v)}
            />
          </label>

          {/* Wholesale Mode Toggle */}
          <label className="flex items-center justify-between p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer group transition-all">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-gray-500 group-hover:text-violet-500 transition-colors" />
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block leading-none">{t("wholesale_mode", "Wholesale Mode")}</span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider block mt-1">{t("wholesale_mode_subtitle", "Allow wholesale price tiers")}</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              color="bg-violet-500"
              checked={formData.wholesaleEnabled}
              onChange={(v) => handleInstantUpdate('wholesaleEnabled', v)}
            />
          </label>

          {/* Touch Keyboard Toggle */}
          <label className="flex items-center justify-between p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer group transition-all">
            <div className="flex items-center gap-3">
              <Keyboard className="w-4 h-4 text-gray-500 group-hover:text-violet-500 transition-colors" />
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block leading-none">{t("touch_keyboard", "Touch Keyboard")}</span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider block mt-1">{t("touch_keyboard_subtitle", "On-screen layout inputs")}</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              color="bg-violet-500"
              checked={formData.touchKeyboardEnabled}
              onChange={(v) => {
                setFormData(p => ({ ...p, touchKeyboardEnabled: v }));
                handleInstantUpdate('touchKeyboardEnabled', v);
              }}
            />
          </label>

          {/* Sound Feedback Toggle */}
          <label className="flex items-center justify-between p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer group transition-all">
            <div className="flex items-center gap-3">
              {formData.soundEnabled
                ? <Volume2 className="w-4 h-4 text-violet-500 transition-colors" />
                : <VolumeX className="w-4 h-4 text-gray-500 group-hover:text-violet-500 transition-colors" />
              }
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block leading-none">{t("sound_feedback", "Sound Feedback")}</span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider block mt-1">{t("sound_feedback_subtitle", "Keyboard UI feedback sounds")}</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              color="bg-violet-500"
              checked={formData.soundEnabled}
              onChange={(v) => {
                setFormData(p => ({ ...p, soundEnabled: v }));
                handleInstantUpdate('soundEnabled', v);
                if (v) setTimeout(() => play('success'), 100);
              }}
            />
          </label>

          {/* Delivery Charges Toggle */}
          <label className="flex items-center justify-between p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer group transition-all">
            <div className="flex items-center gap-3">
              <PlusCircle className="w-4 h-4 text-gray-500 group-hover:text-violet-500 transition-colors" />
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block leading-none">{t("enable_dc_charges", "Enable DC Charges")}</span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider block mt-1">{t("enable_dc_charges_subtitle", "Extra packaging & delivery fees")}</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              color="bg-[#10B981]"
              checked={formData.enableExtraCharges}
              onChange={(v) => handleInstantUpdate('enableExtraCharges', v)}
            />
          </label>

          {/* Allow Negative Stock Toggle — §4.2 MASTER */}
          <label className="flex items-center justify-between p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer group transition-all">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-gray-500 group-hover:text-amber-500 transition-colors" />
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block leading-none">{t("allow_negative_stock", "Allow Negative Stock")}</span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider block mt-1">{t("allow_negative_stock_subtitle", "Let sales proceed when stock is zero")}</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              color="bg-amber-500"
              checked={formData.allowNegativeStock ?? false}
              onChange={(v) => handleInstantUpdate('allowNegativeStock', v)}
            />
          </label>

        </div>
      </div>
    </div>
  );
}
