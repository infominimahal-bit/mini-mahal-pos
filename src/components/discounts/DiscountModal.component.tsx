import { Tag } from 'lucide-react';
import { Discount } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { Button, ToggleSwitch, Select } from '../../shared/ui';
import { useDiscountModalData } from './useDiscountModalData';
import { DiscountConditionsSection } from './DiscountConditionsSection';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  discount: Discount | null;
}

export function DiscountModal({ isOpen, onClose, discount }: DiscountModalProps) {
  const {
    appSettings, formData, setFormData, conditions,
    validDays, productSearch, setProductSearch, pickerProducts, toggleConditionProduct,
    handleSubmit, handleChange, addCondition, updateCondition, removeCondition,
    toggleDay, cardConditionWarning
  } = useDiscountModalData(discount, onClose);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={discount ? 'Edit Discount' : 'New Discount'}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            className="border border-rose-200 dark:border-rose-900/30 text-[#ff4b6e] hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
          >
            {"Discard"}
          </Button>
          <Button
            size="md"
            icon={<Tag className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
            onClick={handleSubmit}
            className="flex-1 sm:flex-none sm:min-w-[240px]"
          >
            {discount ? 'Edit Discount' : 'New Discount'}
          </Button>
        </div>
      }
    >
      <div className="space-y-10">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {"Identity Hub"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Promotion Name *"}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium placeholder:text-gray-600"
                placeholder={'e.g. Eid Mega Sale'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Privilege Type *"}</label>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="!bg-[#f8f9fa] dark:!bg-black/75 !border-none !text-sm !rounded-xl !px-4 !text-gray-900 dark:!text-white !font-medium"
              >
                <option value="percentage" className="dark:bg-surface">{"Percentage Off"}</option>
                <option value="fixed" className="dark:bg-surface">{"Fixed Amount Off"}</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                {formData.type === 'percentage' ? "Factor (%)" : "Amount ({currency})".replace('{currency}', appSettings.currency)} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium placeholder:text-gray-600"
                  placeholder="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-[10px] uppercase tracking-widest">{formData.type === 'percentage' ? '%' : appSettings.currency}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Min Basket"}</label>
              <input
                type="number"
                step="0.01"
                name="minAmount"
                value={formData.minAmount}
                onChange={handleChange}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium placeholder:text-gray-600"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Max Ceiling"}</label>
              <input
                type="number"
                step="0.01"
                name="maxDiscount"
                value={formData.maxDiscount}
                onChange={handleChange}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium placeholder:text-gray-600"
                placeholder={"No cap"}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-2">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {"Operational Window"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Activation"}</label>
              <input
                type="date"
                name="validFrom"
                value={formData.validFrom}
                onChange={handleChange}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Expiry"}</label>
              <input
                type="date"
                name="validTo"
                value={formData.validTo}
                onChange={handleChange}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Weekly Cyclic Schedule"}</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`py-2 rounded-xl text-[10px] font-black transition-all border-2 ${validDays.includes(index)
                    ? 'bg-primary border-primary text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-[#f8f9fa] dark:bg-black/75 border-transparent text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {day.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DiscountConditionsSection
          conditions={conditions}
          addCondition={addCondition}
          updateCondition={updateCondition}
          removeCondition={removeCondition}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          pickerProducts={pickerProducts}
          toggleConditionProduct={toggleConditionProduct}
          cardConditionWarning={cardConditionWarning}
        />

        <div className="space-y-6 pt-2">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {"Status & Behavior"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-5 bg-[#f8f9fa] dark:bg-black/75 border border-gray-200 dark:border-white/5 rounded-[20px] cursor-pointer hover:bg-emerald-50 dark:hover:bg-primary/10 transition-all">
              <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-wider">{"Active Status"}</span>
              <ToggleSwitch checked={formData.active} onChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))} color="bg-primary" className="scale-110" />
            </div>
            <div className="flex items-center justify-between p-5 bg-[#f8f9fa] dark:bg-black/75 border border-gray-200 dark:border-white/5 rounded-[20px] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
              <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-wider">{"Auto-Apply"}</span>
              <ToggleSwitch checked={formData.isAutoApply} onChange={(checked) => setFormData(prev => ({ ...prev, isAutoApply: checked }))} color="bg-blue-500" className="scale-110" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
