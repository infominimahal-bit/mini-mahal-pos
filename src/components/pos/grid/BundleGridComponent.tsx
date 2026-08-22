import { useState, useMemo } from 'react';
import { Gift } from 'lucide-react';
import { Product } from '../../../types';
import { DealSizeSelectorModal } from '../DealSizeSelectorModal';
import { BundleCard } from './BundleCard';
import { buildGroupedBundles } from './bundleUtils';
import { getGridClasses } from './bundleGridClasses';
import { useBundleGridHandlers } from './useBundleGridHandlers';

interface BundleGridProps {
  onAddToCart: (product: Product) => void;
  currency: string;
  isTouchMode: boolean;
  isReturnMode: boolean;
  gridCols?: number;
  appBundles: any[];
  appProducts: any[];
  appCart: any[];
}

export function BundleGrid({ onAddToCart, currency, isTouchMode, isReturnMode, gridCols = 4, appBundles, appProducts, appCart }: BundleGridProps) {
  const rawBundles = (appBundles || []).filter(b => b.active !== false);

  const [activeGroup, setActiveGroup] = useState<any>(null);

  const groupedBundles = useMemo(() => buildGroupedBundles(rawBundles, appProducts), [rawBundles, appProducts]);

  const { handleBundleQuantity, processBundleAdd, handleAddBundle } = useBundleGridHandlers({ appCart, appProducts, isReturnMode, currency, setActiveGroup });

  if (groupedBundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="bg-violet-500/10 p-6 rounded-3xl mb-4">
          <Gift className="h-16 w-16 text-violet-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">{"No Bundles & Deals Yet"}</p>
        <p className="text-[11px] text-gray-400 mt-1 mb-4">{"Go to Inventory → Bundles to create combo deals"}</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/inventory/bundles';
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-500/20"
        >
          {"Create Deal Now"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/10 p-2.5 rounded-xl transition-all duration-300">
        <div className="flex items-center gap-2 min-w-0">
          <Gift className="h-4 w-4 text-violet-500 shrink-0" />
          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wide truncate">
            {"Create & Manage your combo deals in Inventory"}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/inventory/bundles';
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm shrink-0"
        >
          {"Manage Deals"}
        </button>
      </div>

      <div className={getGridClasses(gridCols)}>
        {groupedBundles.map(item => {
          let visibleProducts: any[] = [];
          const isGroup = item.isGroup;
          const displayName = item.name;
          let minPrice = 0;
          let maxPrice = 0;

          if (isGroup) {
            const allProducts = item.bundles.flatMap((b: any) => b.bundleProducts || []);
            const uniqueProducts = Array.from(new Map(allProducts.map((p: any) => [p.id, p])).values());
            visibleProducts = uniqueProducts.slice(0, 4);

            const prices = item.bundles.map((b: any) => b.finalPrice || 0);
            minPrice = Math.min(...prices);
            maxPrice = Math.max(...prices);
          } else {
            visibleProducts = (item.bundleProducts || []).slice(0, 4);
          }

          let bundleQty = 0;
          if (!isGroup) {
            const bundleItemsInCart = appCart.filter((x: any) => {
              const bId = x.bundleId || x.bundle_id;
              return bId && bId.startsWith(item.id + '-');
            });
            if (bundleItemsInCart.length > 0) {
              if (item.items && item.items.length > 0) {
                const firstBi = item.items[0];
                const cartItem = bundleItemsInCart.find(x => x.product.id === firstBi.productId);
                if (cartItem) {
                  bundleQty = Math.round(cartItem.quantity / firstBi.quantity);
                }
              } else {
                bundleQty = bundleItemsInCart[0].quantity;
              }
            }
          }

          return (
            <BundleCard
              key={item.id}
              item={item}
              bundleQty={bundleQty}
              isTouchMode={isTouchMode}
              currency={currency}
              gridCols={gridCols ?? 4}
              onAddBundle={handleAddBundle}
              onUpdateBundleQuantity={handleBundleQuantity}
              visibleProducts={visibleProducts}
              minPrice={minPrice}
              maxPrice={maxPrice}
              displayName={displayName}
              isGroup={isGroup}
            />
          );
        })}
      </div>

      {activeGroup && (
        <DealSizeSelectorModal
          isOpen={true}
          onClose={() => setActiveGroup(null)}
          groupName={activeGroup.name}
          bundles={activeGroup.bundles}
          currency={currency}
          onSelect={(selectedBundle) => {
            processBundleAdd(selectedBundle);
          }}
        />
      )}
    </div>
  );
}
