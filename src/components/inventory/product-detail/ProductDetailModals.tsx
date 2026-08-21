import { Loader2, Save, PackagePlus, Package } from 'lucide-react';
import { Modal, BottomSheet, SegmentedControl, SearchableSelect, ToggleSwitch, Button, Badge } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import type { ProductDetailController } from './useProductDetail';

export function ProductDetailModals({ d }: { d: ProductDetailController }) {
  const {
    t, showAdjustment, setShowAdjustment, adjustmentData, setAdjustmentData, isUpdating, handleAdjustment,
    showRestock, setShowRestock, handleQuickRestock, restockData, setRestockData, appSuppliers, currency, product,
  } = d;

  return (
    <>
      <Modal
        isOpen={showAdjustment}
        onClose={() => setShowAdjustment(false)}
        title={t('stock_adjustment', 'Stock Adjustment')}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="danger"
              onClick={() => setShowAdjustment(false)}
              className="!bg-transparent !border-rose-200 dark:!border-rose-900/30 !text-[#ff4b6e] hover:!bg-rose-50 dark:hover:!bg-rose-500/10 hover:!opacity-100 !shadow-none !px-6 !py-3 !text-[10px] !rounded-full !min-h-0"
            >
              {t('discard', 'DISCARD')}
            </Button>
            <Button
              variant="primary"
              onClick={handleAdjustment}
              disabled={isUpdating || !adjustmentData.quantity}
              className="!px-8 !py-3 !bg-amber-500 hover:!bg-amber-600 !rounded-full !text-[11px] !font-black !shadow-lg !shadow-amber-500/20"
              icon={isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              <span>{t('apply_correction', 'APPLY CORRECTION')}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ml-1">{t('action', 'Action *')}</label>
            <SegmentedControl
              options={[
                { id: 'add', label: t('add_stock', 'Add Stock (+)') },
                { id: 'remove', label: t('remove_stock', 'Remove Stock (-)') }
              ]}
              value={adjustmentData.action}
              onChange={(val) => setAdjustmentData({ ...adjustmentData, action: val })}
              size="md"
            />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ml-1">{t('qty_change_req', 'Qty (Absolute) *')}</label>
              <input
                type="number"
                min="1"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value.replace('-', '') })}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none px-4 py-4 rounded-xl text-xl font-black outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-2 relative z-30">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ml-1">{t('reason_req', 'Reason *')}</label>
              <SearchableSelect
                options={['Correction', 'Damage', 'Theft', 'Expired', 'Gift', 'Return to Vendor'].map(r => ({ id: r, label: r }))}
                value={adjustmentData.reason}
                onChange={(val) => setAdjustmentData({ ...adjustmentData, reason: val })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ml-1">{t('audit_notes', 'Audit Notes')}</label>
            <textarea
              value={adjustmentData.notes}
              onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
              className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none px-4 py-4 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500 min-h-[120px] resize-none dark:text-white"
              placeholder={t('explain_adjustment_placeholder', 'Explain the context of this adjustment...')}
            />
          </div>
        </div>
      </Modal>

      <BottomSheet
        open={showRestock}
        onClose={() => setShowRestock(false)}
        title={t('quick_restock', 'Quick Restock')}
        subtitle={t('quick_restock_sub', 'Add stock directly to this product — same engine as Purchase Orders')}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="danger"
              onClick={() => setShowRestock(false)}
              className="!bg-transparent !border-rose-200 dark:!border-rose-900/30 !text-[#ff4b6e] hover:!bg-rose-50 dark:hover:!bg-rose-500/10 hover:!opacity-100 !shadow-none !px-6 !py-3 !text-[10px] !rounded-full !min-h-0"
            >
              {t('cancel', 'CANCEL')}
            </Button>
            <Button
              variant="primary"
              onClick={handleQuickRestock}
              disabled={isUpdating || !parseFloat(restockData.quantity) || parseFloat(restockData.quantity) <= 0 || !restockData.supplier.trim()}
              className="!px-8 !py-3 !bg-emerald-500 hover:!bg-emerald-600 !rounded-full !text-[11px] !font-black !shadow-lg !shadow-emerald-500/20"
              icon={isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
            >
              <span>{t('admit_to_stock', 'ADMIT TO STOCK')}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl p-4">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-14 h-14 rounded-xl object-cover bg-gray-100 dark:bg-white/5" />
            ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6" />
                </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-tight truncate">{product.name}</p>
              <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 tracking-widest mt-1 truncate">{product.sku || 'No SKU'}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge
                tone={product.stock <= 0 ? 'danger' : 'neutral'}
                size="md"
                className={`!px-3 !py-1 !rounded-lg !text-xs ${product.stock <= 0 ? '!bg-rose-100 !text-rose-700 dark:!bg-rose-500/20 dark:!text-rose-400' : '!bg-gray-100 !text-gray-700 dark:!bg-white/10 dark:!text-gray-300'}`}
              >
                {t('in_stock', 'In Stock')}: {product.stock}
              </Badge>
              {product.supplier && (
                <Badge
                  tone="info"
                  size="md"
                  className="!px-3 !py-1 !rounded-lg !text-xs !bg-primary/10 !text-primary dark:!bg-primary/15 dark:!text-emerald-400"
                >
                  {product.supplier}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ml-1">{t('qty_to_add', 'Qty to Add *')}</label>
              <input
                type="number"
                min="1"
                value={restockData.quantity}
                onChange={(e) => setRestockData({ ...restockData, quantity: e.target.value })}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none px-4 py-4 rounded-xl text-xl font-black outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ml-1">{t('cost_price_optional', 'Cost Price')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={restockData.cost}
                onChange={(e) => setRestockData({ ...restockData, cost: e.target.value })}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none px-4 py-4 rounded-xl text-xl font-black outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                placeholder="0"
              />
            </div>
            <div className="space-y-2 relative z-30 md:col-span-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ml-1">{t('supplier_req', 'Supplier *')}</label>
              <SearchableSelect
                options={appSuppliers.map(s => ({ id: s.id, label: s.name }))}
                value={restockData.supplier}
                onChange={(val) => setRestockData({ ...restockData, supplier: val })}
              />
              {!restockData.supplier.trim() && (
                <p className="text-[10px] font-bold text-rose-500 ml-1">{t('supplier_required_hint', 'A supplier is required to record this stock entry')}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl p-4">
            <div>
              <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">{t('estimated_total', 'Estimated Total')}</p>
              <p className="text-xl font-black text-emerald-500 dark:text-emerald-400 tracking-tight mt-0.5">
                {formatCurrency((parseFloat(restockData.quantity) || 0) * (parseFloat(restockData.cost) || 0), currency)}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-black/30 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/5">
              <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('record_supplier_bill', 'Supplier Bill')}</span>
              <ToggleSwitch
                checked={restockData.recordAsSupplierBill}
                onChange={(v) => setRestockData({ ...restockData, recordAsSupplierBill: v })}
                size="sm"
                color="bg-primary"
              />
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
