import { CircleDollarSign, ShoppingBag, Package, TrendingUp, Database, PackagePlus, ShieldAlert, Tag } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { productsService } from '../../../lib/services';
import { useProductsStore } from '../../../stores';
import { sonner } from '../../../lib/sonner';
import { formatCurrency } from '../../../lib/currencies';
import { ProductIdentityDetails } from './ProductIdentityDetails';
import type { ProductDetailController } from './useProductDetail';

export function ProductOverview({ d }: { d: ProductDetailController }) {
  const { t, totalRevenue, totalSoldUnits, totalCOGS, profitMargin, stockValueCost, stockValueSale, currency, isInfinite, isEditMode, setIsEditMode, product, formData, setFormData, setRestockData, setShowRestock, setShowAdjustment } = d;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: t('revenue', 'Revenue'), value: formatCurrency(totalRevenue, currency), icon: CircleDollarSign, color: 'text-primary', bg: 'bg-primary/10' },
            { label: t('sold_qty', 'Sold'), value: `${totalSoldUnits}`, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: t('cogs_cost', 'COGS (Cost)'), value: formatCurrency(totalCOGS, currency), icon: Package, color: 'text-gray-600', bg: 'bg-gray-500/10' },
            { label: t('margin', 'Margin'), value: `${profitMargin.toFixed(1)}%`, icon: TrendingUp, color: profitMargin > 20 ? 'text-violet-500' : 'text-orange-500', bg: profitMargin > 20 ? 'bg-violet-500/10' : 'bg-orange-500/10' },
            { label: t('stock_value_cost', 'Stock Value (Cost)'), value: formatCurrency(stockValueCost, currency), icon: Database, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: t('stock_value_sale', 'Stock Value (Sale)'), value: formatCurrency(stockValueSale, currency), icon: Tag, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          ].map(m => (
            <div key={m.label} className="bg-white dark:bg-[#1C1C1C] p-4 sm:p-4 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-sm transition-all hover:shadow-md active:scale-95 group">
              <div className={`p-2.5 rounded-2xl w-fit ${m.bg} ${m.color} transition-transform group-hover:scale-110`}>
                <m.icon className="w-5 h-5" />
              </div>
              <p className={`text-base sm:text-sm font-black mt-4 tracking-tighter ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-none mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1C1C1C] p-6 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="text-[11px] font-black text-gray-700 dark:text-white uppercase tracking-wider">{t('quick_controls', 'Quick Controls')}</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isInfinite && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setRestockData({
                      quantity: '1',
                      supplier: product.supplier || '',
                      cost: product.cost?.toString() || '',
                      recordAsSupplierBill: true
                    });
                    setShowRestock(true);
                  }}
                  className="!px-4 !py-2 !bg-emerald-500 hover:!bg-emerald-600 !text-[10px] !font-black !rounded-xl !shadow-sm hover:!scale-[1.02]"
                  icon={<PackagePlus className="w-3.5 h-3.5" />}
                >
                  {t('restock', 'RESTOCK')}
                </Button>
              )}
              {!isInfinite && (
                <Button
                  variant="primary"
                  onClick={() => setShowAdjustment(true)}
                  className="!px-4 !py-2 !bg-amber-500 hover:!bg-amber-600 !text-[10px] !font-black !rounded-xl !shadow-sm hover:!scale-[1.02]"
                >
                  {t('adjust', 'ADJUST')}
                </Button>
              )}
            </div>
          </div>

          {formData.productType === 'simple' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1 ml-1">
                  <p className="text-[9px] text-gray-600 uppercase font-bold">{t('min_stock_alert', 'Min Stock Alert')}</p>
                  {parseInt(formData.minStock) !== (product.minStock || 0) && (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const newMin = parseInt(formData.minStock) || 0;
                          const saved = await productsService.update(product.id, { minStock: newMin });
                          useProductsStore.getState().updateProduct(saved);
                          sonner.success('Min stock alert updated');
                        } catch (e) {
                          sonner.error('Failed to save min stock');
                        }
                      }}
                      className="!min-h-0 !p-0 !bg-transparent !text-[9px] !font-black !text-primary hover:!underline"
                    >
                      {t('save', 'Save')}
                    </Button>
                  )}
                </div>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-black/30 border-none px-4 py-2.5 rounded-xl text-xs font-bold outline-none ring-1 ring-transparent focus:ring-emerald-500/50 transition-all"
                />
              </div>
              {isEditMode && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <div className="flex items-center justify-between mb-1 ml-1">
                      <div className="flex items-center gap-1">
                        <p className="text-[9px] text-gray-600 uppercase font-bold">{t('stock', 'Stock Qty')}</p>
                      </div>
                    </div>
                    <input
                      type="number"
                      disabled={formData.trackInventory === false}
                      value={formData.trackInventory === false ? '' : formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder={formData.trackInventory === false ? '∞' : '0'}
                      className="w-full bg-gray-50 dark:bg-black/30 border-none px-4 py-2.5 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none ring-1 ring-transparent focus:ring-emerald-500/50 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 ml-1">
                      <div className="flex items-center gap-1">
                        <p className="text-[9px] text-gray-600 uppercase font-bold">{t('sale_price', 'Sale Price')}</p>
                      </div>
                      {parseFloat(formData.price) !== product.price && (
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              const newPrice = parseFloat(formData.price) || 0;
                              const saved = await productsService.update(product.id, { price: newPrice });
                              useProductsStore.getState().updateProduct(saved);
                              sonner.success('Sale price updated');
                            } catch (e) {
                              sonner.error('Failed to save sale price');
                            }
                          }}
                          className="!min-h-0 !p-0 !bg-transparent !text-[9px] !font-black !text-primary hover:!underline"
                        >
                          {t('save', 'Save')}
                        </Button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-black/30 border-none px-4 py-2.5 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none ring-1 ring-transparent focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 ml-1">
                      <div className="flex items-center gap-1">
                        <p className="text-[9px] text-gray-600 uppercase font-bold">{t('cost_price', 'Cost Price')}</p>
                        <HelpTooltip content="Cost changes will instantly update the product's cost price for accurate profit calculations." />
                      </div>
                      {parseFloat(formData.cost) !== product.cost && (
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              const newCost = parseFloat(formData.cost) || 0;
                              const saved = await productsService.update(product.id, { cost: newCost });
                              useProductsStore.getState().updateProduct(saved);
                              sonner.success('Cost price updated');
                            } catch (e) {
                              sonner.error('Failed to save cost price');
                            }
                          }}
                          className="!min-h-0 !p-0 !bg-transparent !text-[9px] !font-black !text-primary hover:!underline"
                        >
                          {t('save', 'Save')}
                        </Button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-black/30 border-none px-4 py-2.5 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none ring-1 ring-transparent focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditMode && (
        <ProductIdentityDetails d={d} />
      )}
    </>
  );
}
