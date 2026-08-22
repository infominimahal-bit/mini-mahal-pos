import { memo } from 'react';
import { Plus, Minus, Gift, Package } from 'lucide-react';

interface BundleCardProps {
  item: any;
  bundleQty: number;
  isTouchMode: boolean;
  currency: string;
  gridCols: number;
  onAddBundle: (item: any) => void;
  onUpdateBundleQuantity: (item: any, delta: number) => void;
  visibleProducts: any[];
  minPrice: number;
  maxPrice: number;
  displayName: string;
  isGroup: boolean;
}

export const BundleCard = memo(
  function BundleCard({
    item,
    bundleQty,
    isTouchMode,
    currency,
    gridCols,
    onAddBundle,
    onUpdateBundleQuantity,
    visibleProducts,
    minPrice,
    maxPrice,
    displayName,
    isGroup
  }: BundleCardProps) {
    return (
      <div
        className={`group relative bg-white dark:bg-[#1C1C1C] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${bundleQty > 0 ? 'ring-2 ring-emerald-500 shadow-md shadow-emerald-500/10' : ''}`}
        style={{
          minHeight: (typeof window !== 'undefined' && window.innerWidth >= 1024)
            ? (gridCols === 0 || gridCols >= 4 ? (isTouchMode ? '120px' : '140px') :
              gridCols === 3 ? (isTouchMode ? '150px' : '180px') :
                (isTouchMode ? '180px' : '220px'))
            : (isTouchMode ? '120px' : '140px')
        }}
        onClick={() => onAddBundle(item)}
      >
        <div className={`relative overflow-hidden bg-gray-50 dark:bg-[#262626] ${isTouchMode ? 'aspect-square' : 'aspect-[4/3]'}`}>
          {item.image ? (
            <img src={item.image} className="w-full h-full object-cover" loading="lazy" />
          ) : visibleProducts.length > 0 ? (
            <div className={`grid h-full ${visibleProducts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {visibleProducts.map((product: any, idx: number) => {
                const total = visibleProducts.length;
                const isLastOfThree = total === 3 && idx === 2;
                const cellClasses = [
                  'relative overflow-hidden bg-gray-50 dark:bg-black/20',
                  idx >= 2 ? 'border-t border-white/10 dark:border-white/5' : '',
                  idx % 2 === 0 && idx < 2 ? 'border-r border-white/10 dark:border-white/5' : '',
                  isLastOfThree ? 'col-span-2' : '',
                ].filter(Boolean).join(' ');
                return (
                  <div key={product.id || idx} className={cellClasses}>
                    {product.image ? (
                      <img src={product.image} className="w-full h-full object-cover" loading="lazy" />
                    ) : item.bundleMinPrice !== null && item.bundleMaxPrice !== null && item.bundleMinPrice < item.bundleMaxPrice ? (
                      <span className="text-primary dark:text-emerald-400 font-black text-[10px] sm:text-xs shrink-0">
                        {currency}{item.bundleMinPrice.toLocaleString()} – {currency}{item.bundleMaxPrice.toLocaleString()}
                      </span>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleProducts.length === 1 && (
                <div className="relative overflow-hidden bg-gray-50 dark:bg-black/20 border-l border-white/10 dark:border-white/5 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                </div>
              )}
              {visibleProducts.length === 2 && (
                <>
                  <div className="relative overflow-hidden bg-gray-50 dark:bg-black/20 border-t border-white/10 dark:border-white/5 border-r border-white/10 dark:border-white/5 flex items-center justify-center">
                    <Gift className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                  </div>
                  <div className="relative overflow-hidden bg-gray-50 dark:bg-black/20 border-t border-white/10 dark:border-white/5 flex items-center justify-center">
                    <Gift className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                  </div>
                </>
              )}
              {visibleProducts.length === 3 && (
                <div className="relative overflow-hidden bg-gray-50 dark:bg-black/20 border-t border-white/10 dark:border-white/5 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gift className="h-12 w-12 text-violet-300 dark:text-violet-600" />
            </div>
          )}

          {!isGroup && item.discountValue > 0 && (
            <div className="absolute top-1 left-1 bg-violet-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-lg z-10 flex items-center gap-1">
              -{item.discountValue}{item.discountType === 'percentage' ? '%' : ` ${currency}`}
            </div>
          )}

          {isGroup && (
            <div className="absolute top-1 left-1 bg-gray-900 dark:bg-white text-white dark:text-black text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-lg z-10 uppercase tracking-widest">
              {item.bundles.length} Sizes
            </div>
          )}

          <div className="absolute top-1 right-1 flex items-center bg-violet-500/90 text-white p-1 rounded-lg text-[8px] font-black shadow-md z-10">
            <Gift className="h-2.5 w-2.5" />
          </div>

          {bundleQty > 0 && (
            <div className="absolute inset-x-0.5 bottom-0.5 flex items-center justify-between bg-white/95 dark:bg-black/95 rounded-lg p-0.5 shadow-lg z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateBundleQuantity(item, -1);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-600 dark:text-gray-400"
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
              <span className="font-black text-[9px] sm:text-xs text-gray-900 dark:text-white px-0.5">
                {bundleQty}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateBundleQuantity(item, 1);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-violet-500"
              >
                <Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          )}
        </div>

        <div className="p-1.5 sm:p-2 space-y-0.5">
          <h3 className={`font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight line-clamp-2 ${isTouchMode ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>
            {displayName}
          </h3>

          <div className="flex items-center justify-between gap-1">
            {isGroup ? (
              <span className="text-primary dark:text-emerald-400 font-black text-[10px] sm:text-xs shrink-0">
                From {currency}{minPrice.toLocaleString()}
              </span>
            ) : (
              <>
                <span className="text-[9px] text-gray-400 line-through truncate">{currency}{item.totalPrice.toLocaleString()}</span>
                <span className="text-primary dark:text-emerald-400 font-black text-[10px] sm:text-xs shrink-0">{currency}{item.finalPrice.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.bundleQty === next.bundleQty &&
      prev.isTouchMode === next.isTouchMode &&
      prev.currency === next.currency &&
      prev.gridCols === next.gridCols &&
      prev.minPrice === next.minPrice &&
      prev.maxPrice === next.maxPrice &&
      prev.isGroup === next.isGroup &&
      prev.displayName === next.displayName &&
      prev.item.id === next.item.id &&
      prev.item.name === next.item.name &&
      prev.item.finalPrice === next.item.finalPrice &&
      prev.item.totalPrice === next.item.totalPrice &&
      prev.item.bundleMinPrice === next.item.bundleMinPrice &&
      prev.item.bundleMaxPrice === next.item.bundleMaxPrice &&
      JSON.stringify(prev.visibleProducts) === JSON.stringify(next.visibleProducts)
    );
  }
);
