import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { SharedSearchBar, SharedProductList } from '../../shared/modules/search-and-list';
import { Select } from '../../shared/ui';

interface DiscountConditionsSectionProps {
  conditions: any[];
  addCondition: () => void;
  updateCondition: (index: number, field: any, value: any) => void;
  removeCondition: (index: number) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  pickerProducts: any[];
  toggleConditionProduct: (index: number, productId: string) => void;
  cardConditionWarning: { type: string; message: string } | null;
}

export function DiscountConditionsSection({
  conditions,
  addCondition,
  updateCondition,
  removeCondition,
  productSearch,
  setProductSearch,
  pickerProducts,
  toggleConditionProduct,
  cardConditionWarning,
}: DiscountConditionsSectionProps) {
  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
          <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
          {"Trigger Protocols"}
        </h3>
        <button
          type="button"
          onClick={addCondition}
          className="px-4 py-2 bg-emerald-50 dark:bg-primary/10 text-primary hover:bg-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          {"Add Rule"}
        </button>
      </div>

      {cardConditionWarning && (
        <div className={`p-4 rounded-[16px] border ${cardConditionWarning.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{cardConditionWarning.message}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {conditions.map((condition, index) => (
          <div key={index} className="p-5 bg-[#f8f9fa] dark:bg-black/75 rounded-[20px] border border-gray-200 dark:border-white/5 relative group">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2 block">{"Variable"}</label>
                <Select
                  value={condition.type}
                  onChange={(e) => updateCondition(index, 'type', e.target.value)}
                  className="!bg-white dark:!bg-surface !border-none !rounded-xl !px-4 !text-[11px] !font-black !text-gray-900 dark:!text-white"
                >
                  <option value="min_amount" className="dark:bg-surface">{"Threshold Amount"}</option>
                  <option value="specific_products" className="dark:bg-surface">{"Product Whitelist"}</option>
                  <option value="payment_method" className="dark:bg-surface">{"Payment Gateway"}</option>
                  <option value="customer_tier" className="dark:bg-surface">{"Membership Tier"}</option>
                  <option value="card_type" className="dark:bg-surface">{"Network (Visa/MC)"}</option>
                  <option value="bank_name" className="dark:bg-surface">{"Issuing Institution"}</option>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2 block">{"Condition Value"}</label>
                {condition.type === 'specific_products' ? (
                  <div className="space-y-3">
                    <SharedSearchBar
                      value={productSearch}
                      onChange={setProductSearch}
                      placeholder={'Search products to add...'}
                    />
                    <SharedProductList
                      items={pickerProducts}
                      selectedIds={Array.isArray(condition.value) ? condition.value : []}
                      onItemSelect={(item) => toggleConditionProduct(index, item.id)}
                      onClearSearch={() => setProductSearch('')}
                      headerTitle={'Matching Products'}
                      maxHeight="220px"
                      emptyStateText={'NO PRODUCTS FOUND'}
                      className="rounded-2xl shadow-none"
                    />
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-surface rounded-xl border border-gray-50 dark:border-white/5">
                      <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest shrink-0">{"Min Qty:"}</span>
                      <input
                        type="number"
                        min="1"
                        value={condition.minQuantity || 1}
                        onChange={(e) => updateCondition(index, 'minQuantity', parseInt(e.target.value) || 1)}
                        className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-900 dark:text-white focus:ring-0 outline-none"
                      />
                    </div>
                  </div>
                ) : condition.type === 'payment_method' || condition.type === 'customer_tier' || condition.type === 'card_type' || condition.type === 'bank_name' ? (
                  <Select
                    value={condition.value as string}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    className="!bg-white dark:!bg-surface !border-none !rounded-xl !px-4 !text-[11px] !font-black !text-gray-900 dark:!text-white"
                  >
                    <option value="" className="dark:bg-surface">Select...</option>
                    {condition.type === 'payment_method' && (
                      <>
                        <option value="cash" className="dark:bg-surface">{"Cash Settlement"}</option>
                        <option value="card" className="dark:bg-surface">{"Card"}</option>
                        <option value="online" className="dark:bg-surface">{"Online Wallet"}</option>
                      </>
                    )}
                    {condition.type === 'customer_tier' && (
                      <>
                        <option value="Standard" className="dark:bg-surface">{'Standard Tier'}</option>
                        <option value="Premium" className="dark:bg-surface">{'Premium Tier'}</option>
                        <option value="VIP" className="dark:bg-surface">{'VIP Elite'}</option>
                        <option value="Wholesale" className="dark:bg-surface">{'Trade Partner'}</option>
                      </>
                    )}
                    {condition.type === 'card_type' && (
                      <>
                        <option value="visa" className="dark:bg-surface">{'Visa Network'}</option>
                        <option value="mastercard" className="dark:bg-surface">{'Mastercard Network'}</option>
                        <option value="amex" className="dark:bg-surface">{'Amex Enterprise'}</option>
                        <option value="discover" className="dark:bg-surface">{'Discover Net'}</option>
                      </>
                    )}
                    {condition.type === 'bank_name' && (
                      ['Bank of Ceylon', 'People\'s Bank', 'Commercial Bank', 'HNB', 'Sampath Bank', 'NTB', 'DFCC', 'Seylan Bank', 'NDB'].map(bank => (
                        <option key={bank} value={bank} className="dark:bg-surface">{bank}</option>
                      ))
                    )}
                  </Select>
                ) : (
                  <input
                    type={condition.type === 'min_amount' ? 'number' : 'text'}
                    value={condition.value as string}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    className="w-full bg-white dark:bg-surface border-none rounded-xl px-4 py-2.5 text-[11px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-gray-600"
                    placeholder="Value..."
                  />
                )}
              </div>
            </div>
            <button
              onClick={() => removeCondition(index)}
              className="absolute -top-3 -right-3 p-2 bg-white dark:bg-[#2A2A2A] text-rose-500 rounded-full shadow-lg border border-gray-200 dark:border-white/5 hover:scale-110 active:scale-90 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
