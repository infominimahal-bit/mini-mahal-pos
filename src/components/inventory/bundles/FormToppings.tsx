import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { sonner } from '../../../lib/sonner';
import { useTranslation } from '../../../hooks/useTranslation';
import type { BundleForm } from './formTypes';

interface FormToppingsProps {
  form: BundleForm;
  setForm: (updater: (prev: BundleForm) => BundleForm) => void;
  showToppingEditor: boolean;
  setShowToppingEditor: (val: boolean) => void;
}

export function FormToppings({ form, setForm, showToppingEditor, setShowToppingEditor }: FormToppingsProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-gray-200 dark:border-white/5 pt-4 mt-4">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShowToppingEditor(!showToppingEditor)}
        className="!min-h-0 !p-0 !bg-transparent !text-[10px] !font-black !uppercase !tracking-widest !text-gray-600 dark:!text-gray-400 hover:!text-primary"
      >
        {showToppingEditor ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Extra Toppings — {form.extraToppings.filter(t => t.active).length} active
      </Button>
      {showToppingEditor && (
        <div className="mt-3 space-y-2">
          {form.extraToppings.length === 0 && (
            <p className="text-[10px] text-gray-500 italic">No extra toppings for this deal. Add one below.</p>
          )}
          {form.extraToppings.map((t, idx) => (
            <div key={t.id} className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant={t.active ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setForm(prev => {
                  const updated = [...prev.extraToppings];
                  updated[idx] = { ...updated[idx], active: !updated[idx].active };
                  return { ...prev, extraToppings: updated };
                })}
                className={`!min-h-0 !rounded-lg !text-[10px] ${t.active ? '!bg-primary !text-white !shadow-none' : '!bg-gray-200 dark:!bg-white/10 !text-gray-500 hover:!bg-gray-300 dark:hover:!bg-white/20 !shadow-none'}`}
              >
                {t.active ? 'ON' : 'OFF'}
              </Button>
              <input
                type="text"
                value={t.name}
                onChange={e => setForm(prev => {
                  const updated = [...prev.extraToppings];
                  updated[idx] = { ...updated[idx], name: e.target.value };
                  return { ...prev, extraToppings: updated };
                })}
                className="flex-1 min-w-[100px] bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold"
                placeholder="Name"
              />
              <input
                type="number" min="0"
                value={t.priceSmall || ''}
                onChange={e => setForm(prev => {
                  const val = Number(e.target.value);
                  const updated = [...prev.extraToppings];
                  updated[idx] = { ...updated[idx], priceSmall: val, priceMedium: val, priceLarge: val };
                  return { ...prev, extraToppings: updated };
                })}
                className="w-24 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-center"
                placeholder="Price"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const result = sonner.deleteConfirm(`topping "${t.name}"`);
                  result.then(r => {
                    if (r.isConfirmed) {
                      setForm(prev => ({ ...prev, extraToppings: prev.extraToppings.filter(x => x.id !== t.id) }));
                    }
                  });
                }}
                className="!min-h-0 !p-1.5 !rounded-lg !bg-transparent !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-500/10"
                icon={<Trash2 className="h-3 w-3" />}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setForm(prev => ({
              ...prev,
              extraToppings: [...prev.extraToppings, {
                id: Date.now().toString() + Math.random().toString(36).slice(2),
                name: '',
                priceSmall: 0,
                priceMedium: 0,
                priceLarge: 0,
                active: true,
              }]
            }))}
            className="!min-h-0 !p-0 !bg-transparent !text-[10px] !font-black !uppercase !tracking-widest !text-primary hover:!text-emerald-600"
            icon={<Plus className="h-3 w-3" />}
          >
            Add Topping
          </Button>
        </div>
      )}
    </div>
  );
}
