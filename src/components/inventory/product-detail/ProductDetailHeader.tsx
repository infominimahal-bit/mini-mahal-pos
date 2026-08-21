import { ArrowLeft, Package, Camera, Star, BadgeInfo, ShieldAlert, Edit3, X, RefreshCw } from 'lucide-react';
import { Button, Badge } from '../../../shared/ui';
import type { ProductDetailController } from './useProductDetail';

export function ProductDetailHeader({ d }: { d: ProductDetailController }) {
  const {
    product, onBack, t, formData, isEditMode, setIsEditMode, setShowMediaLibrary, handleRecalc,
    isInfinite, isOut, isLow, stockPct,
  } = d;

  return (
    <div className="bg-white dark:bg-surface border-b border-gray-200 dark:border-white/5 px-3 sm:px-6 py-6 rounded-t-[2.5rem] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative">
        <Button variant="ghost" onClick={onBack} className="absolute left-0 top-0 sm:relative !min-h-0 !p-3 !rounded-2xl !bg-gray-100 dark:!bg-white/5 hover:!bg-gray-200 dark:hover:!bg-white/10 hover:!scale-105 active:!scale-90 z-20" icon={<ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />} />

        <div className="relative group/img mt-4 sm:mt-0">
          <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-[2rem] sm:rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border-4 border-white dark:border-[#171717] ring-1 ring-gray-100 dark:ring-white/5 flex items-center justify-center shadow-xl overflow-hidden flex-shrink-0 transition-transform duration-500 group-hover/img:scale-105">
            {formData.image ? <img src={formData.image} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 sm:h-8 text-primary dark:text-emerald-400" />}
          </div>

          <div className="absolute -bottom-1 -right-1">
            <Button
              variant="ghost"
              onClick={() => setShowMediaLibrary(true)}
              className={`!min-h-0 !p-3 !rounded-2xl !shadow-lg !border-2 !border-white dark:!border-[#171717] active:!scale-95 ${isEditMode ? '!bg-primary !text-white scale-110' : '!bg-white dark:!bg-[#262626] !text-gray-600 scale-90'}`}
              icon={<Camera className="w-5 h-5" />}
            />
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="solid"
              tone={isOut ? 'danger' : isLow ? 'warning' : 'success'}
              className={`!px-3 !py-1 !text-[10px] !shadow-lg ${isOut ? '!bg-red-500 !shadow-red-500/20' : isLow ? '!bg-amber-500 !shadow-amber-500/20' : '!bg-primary !shadow-emerald-500/20'}`}
            >
              {isInfinite ? t('infinity_mode', 'Infinity Mode') : isOut ? t('out_of_stock', 'Out of Stock') : isLow ? t('low_stock', 'Low Stock') : t('in_stock', 'In Stock')}
            </Badge>
            {product.isFeatured && (
              <div className="p-1.5 bg-yellow-400 text-white rounded-lg shadow-lg shadow-yellow-400/20">
                <Star className="w-3 h-3 fill-current" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 w-full max-w-xs sm:max-w-none">
            {isEditMode ? (
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-50 dark:bg-white/5 border-none px-4 py-2 rounded-2xl text-xl font-black text-gray-900 dark:text-white uppercase outline-none text-center sm:text-left ring-1 ring-transparent focus:ring-emerald-500/50 transition-all"
                placeholder={t('product_name_req', 'Product Name *').replace(' *', '')}
              />
            ) : (
              <h2 className="text-2xl sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1">{product.name}</h2>
            )}
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">{t('sku', 'SKU')}</p>
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400 font-bold">{product.sku}</span>
              </div>
              <div className="w-px h-6 bg-gray-100 dark:bg-white/5" />
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">{t('category', 'Category')}</p>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-bold">{product.category}</span>
              </div>
            </div>
          </div>
        </div>

          <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <Button
            variant="secondary"
            onClick={handleRecalc}
            className="flex-1 sm:flex-none !p-4 sm:!p-2.5 !rounded-2xl !text-[11px] !font-black !shadow-lg !bg-white dark:!bg-white/5 !border-gray-200 dark:!border-white/10"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            {t('recalc_stock', 'Recalc')}
          </Button>
          <Button
            variant={isEditMode ? 'danger' : 'secondary'}
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex-1 sm:flex-none !p-4 sm:!p-2.5 !rounded-2xl !text-[11px] !font-black !shadow-lg ${isEditMode ? '!shadow-rose-500/20' : '!bg-white dark:!bg-white/5 !border-gray-200 dark:!border-white/10 !shadow-none'}`}
          >
            {isEditMode ? <><X className="h-4 w-4" /> {t('stop', 'Stop')}</> : <><Edit3 className="h-4 w-4" /> {t('edit', 'Edit')}</>}
          </Button>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 flex-shrink-0 mt-4 lg:mt-0 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
          {[
            { label: t('stock', 'Stock'), value: isInfinite ? '∞' : `${product.stock}`, color: isLow || isOut ? 'text-red-500' : 'text-gray-900 dark:text-white' },
            { label: t('sales', 'Sales'), value: `${d.totalSoldUnits}`, color: 'text-gray-900 dark:text-white' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-gray-600 font-bold">{stat.label}</p>
            </div>
          ))}
          <div className="w-28">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1 font-bold">
              <span>{t('health', 'Health')}</span>
              <span>{stockPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isLow || isOut ? 'bg-gradient-to-r from-red-400 to-red-500' : stockPct < 60 ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'}`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-6 px-6 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
          <BadgeInfo className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">{t('integrated_smart_hub', 'Integrated Smart Hub')}</span>
        </div>
        {isEditMode && (
          <div className="flex items-center gap-2 bg-amber-500/5 px-3 py-1.5 rounded-full border border-amber-500/10 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">{t('edit_mode_active', 'Edit Mode Active')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
