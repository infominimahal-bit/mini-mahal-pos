import { useInventoryStore, useSettingsStore, useUsersStore } from '../../stores';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CreditCard, ShoppingBag, Save, Building2 } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { sonner } from '../../lib/sonner';
import { Button, ToggleSwitch, Select } from '../../shared/ui';
import { buildExpensePayload } from './expenseModalUtils';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt'> & { supplierId?: string }) => Promise<void>;
  expense?: Expense | null;
}

export function ExpenseModal({ isOpen, onClose, onSave, expense }: ExpenseModalProps) {
  const appSettings = useSettingsStore(s => s.settings);
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSuppliers = useInventoryStore(s => s.suppliers);

  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    date: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'online',
    storeType: 'retail' as 'retail' | 'wholesale' | undefined,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        date: format(new Date(expense.date), 'yyyy-MM-dd'),
        paymentMethod: expense.paymentMethod,
        storeType: expense.storeType,
        notes: expense.notes || ''
      });
      setSelectedSupplierId('');
    } else {
      setFormData({
        description: '',
        amount: '',
        category: EXPENSE_CATEGORIES[0],
        date: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'cash',
        storeType: appSettings.wholesaleEnabled ? undefined : (appSettings.retailEnabled ? 'retail' : undefined),
        notes: ''
      });
      setSelectedSupplierId('');
    }
  }, [expense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        sonner.error('Amount must be greater than zero.');
        setIsSubmitting(false);
        return;
      }

      await onSave(buildExpensePayload(formData, isManualOverride, appCurrentUser, selectedSupplierId) as any);
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
      <Button
        variant="ghost"
        size="md"
        onClick={onClose}
        className="border border-rose-200 dark:border-rose-900/30 text-[#ff4b6e] hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
      >
        {"discard"}
      </Button>
      <Button
        size="md"
        type="submit"
        loading={isSubmitting}
        icon={<Save className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
        className="flex-1 sm:flex-none sm:min-w-[240px]"
      >
        {expense ? "commit_changes" : "register_expense"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? "edit_expense" : "register_new_expense"}
      maxWidth="lg"
      footer={footer}
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-10">
        {/* Core Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {"transaction_details"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"description"} *</label>
              <input
                type="text"
                required
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder={"expense_desc_placeholder"}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"amount"} *</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-black"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setFormData({ ...formData, amount: val });
                    }
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-[10px] uppercase tracking-widest">{appSettings.currency}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"expense_date"} *</label>
              <input
                type="date"
                required
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {"classification"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"category"} *</label>
              <Select
                required
                className="!bg-[#f8f9fa] dark:!bg-black/75 !border-none !text-sm !rounded-xl !px-4 !text-gray-900 dark:!text-white"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-surface">
                    {t('category_' + cat.toLowerCase(), cat)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"payment_method"} *</label>
              <Select
                required
                className="!bg-[#f8f9fa] dark:!bg-black/75 !border-none !text-sm !rounded-xl !px-4 !text-gray-900 dark:!text-white"
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              >
                <option value="cash" className="dark:bg-surface">{"cash_settlement"}</option>
                <option value="card" className="dark:bg-surface">{"card_payment"}</option>
                <option value="online" className="dark:bg-surface">{"online_wallet"}</option>
              </Select>
            </div>
            {formData.category === 'Supplies' && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Supplier"}</label>
                <SearchableSelect
                  options={appSuppliers.map(s => ({ id: s.id, label: s.name }))}
                  value={selectedSupplierId}
                  onChange={setSelectedSupplierId}
                  placeholder={"Link to supplier (optional)"}
                  icon={Building2}
                />
                <p className="text-[9px] text-gray-500 dark:text-gray-400">{"Links this expense to the supplier and raises their payable."}</p>
              </div>
            )}
          </div>
        </div>

        {/* Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {"operational_intelligence"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {(appSettings.wholesaleEnabled) && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"channel_selection"}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: undefined, label: "general", icon: ShoppingBag, enabled: true },
                    { id: 'retail', label: "retail", icon: CreditCard, enabled: appSettings.retailEnabled },
                    { id: 'wholesale', label: "wholesale", icon: ShoppingBag, enabled: appSettings.wholesaleEnabled }
                  ].filter(c => c.enabled !== false).map((c) => (
                    <Button
                      key={c.id ?? 'general'}
                      variant="ghost"
                      type="button"
                      onClick={() => setFormData({ ...formData, storeType: c.id as any })}
                      className={cn(
                        "!min-h-0 !flex-col !gap-2 !p-4 !rounded-xl !border active:!scale-95 !normal-case !tracking-normal !font-normal",
                        formData.storeType === c.id
                          ? '!bg-primary !border-primary !text-white !shadow-lg !shadow-emerald-500/20'
                          : '!bg-[#f8f9fa] dark:!bg-black/20 !border-gray-200 dark:!border-white/5 !text-gray-600'
                      )}
                    >
                      <c.icon className={cn("h-5 w-5", formData.storeType === c.id ? 'text-white' : 'text-gray-600')} />
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", formData.storeType === c.id ? 'text-white' : 'text-gray-600 dark:text-gray-400')}>{c.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"administrative_notes"}</label>
              <textarea
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all min-h-[100px] resize-none"
                placeholder={"expense_notes_placeholder"}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Manual Override Toggle */}
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3.5 rounded-xl">
              <div className="flex-1">
                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">{"Manual Override"}</p>
                <p className="text-[9px] text-amber-600/70 dark:text-amber-500/60 mt-0.5">{"Admin amount correction — logged"}</p>
              </div>
              <ToggleSwitch
                checked={isManualOverride}
                onChange={setIsManualOverride}
                color="bg-amber-500"
                className="!shrink-0"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
