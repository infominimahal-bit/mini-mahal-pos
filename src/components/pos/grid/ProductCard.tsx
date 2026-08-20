import { memo } from 'react';
import { Package, Star, Plus, Minus, Infinity } from 'lucide-react';
import { Product } from '../../../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (product: Product, delta: number) => void;
  cartQuantity?: number;
  currency: string;
  isTouchMode: boolean;
  gridCols?: number;
}

export const ProductCard = memo(function ProductCard({ product, onAddToCart, onUpdateQuantity, cartQuantity = 0, isTouchMode, currency, gridCols = 4 }: ProductCardProps) {
  const shouldTrackInventory = product.trackInventory !== false;
  const isNegativeStock = shouldTrackInventory && product.stock < 0;
  const isNoStock = shouldTrackInventory && product.stock === 0;
  const isLowStock = shouldTrackInventory && product.stock > 0 && product.stock <= (product.minStock || 5);
  const isInfinite = !shouldTrackInventory || product.stock >= 990000;

  return (
    <div
      onClick={() => {
        onAddToCart(product);
      }}
      className={`group relative bg-white dark:bg-[#1C1C1C] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${cartQuantity !== 0 ? 'ring-2 ring-emerald-500 shadow-md shadow-emerald-500/10' : ''
        }`}
      style={{
        minHeight: (typeof window !== 'undefined' && window.innerWidth >= 1024)
          ? (gridCols === 0 || gridCols >= 4 ? (isTouchMode ? '120px' : '140px') :
            gridCols === 3 ? (isTouchMode ? '150px' : '180px') :
              (isTouchMode ? '180px' : '220px'))
          : (isTouchMode ? '120px' : '140px')
      }}
    >
      <div className={`relative overflow-hidden bg-gray-50 dark:bg-[#262626] ${isTouchMode ? 'aspect-square' : 'aspect-[4/3]'}`}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className={`${isTouchMode ? 'h-8 w-8' : 'h-6 w-6'} text-gray-300`} />
          </div>
        )}

        {product.isFeatured && (
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-yellow-400 text-white p-0.5 rounded-full shadow-lg z-10">
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-white" />
          </div>
        )}

        {cartQuantity !== 0 && (
          <div className="absolute inset-x-0.5 bottom-0.5 flex items-center justify-between bg-white/95 dark:bg-black/95 rounded-lg p-0.5 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-300 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity?.(product, -1);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-600 dark:text-gray-400"
            >
              <Minus className="h-2.5 w-2.5" />
            </button>
            <span className="font-black text-[9px] sm:text-xs text-gray-900 dark:text-white px-0.5">
              {cartQuantity}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity?.(product, 1);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-primary"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {cartQuantity === 0 && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              <div className="bg-primary text-white p-1.5 rounded-lg shadow-xl">
                <Plus className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider shadow-md z-10 ${isInfinite
          ? 'bg-violet-500 text-white'
          : isNegativeStock
            ? 'bg-red-500 text-white'
            : isNoStock
              ? 'bg-orange-500 text-white'
              : isLowStock
                ? 'bg-amber-500 text-white'
                : 'bg-primary text-white'
          }`}>
          {isInfinite
            ? <Infinity className="h-3 w-3" />
            : isNegativeStock
              ? "NO STOCK"
              : isNoStock
                ? "NO STOCK"
                : product.stock
          }
        </div>
      </div>

      <div className="p-1.5 sm:p-2 space-y-0.5">
        <h3 className={`font-black text-gray-900 dark:text-white uppercase tracking-tight leading-[1.1] mb-0.5 break-words line-clamp-2 ${isTouchMode ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'
          }`}>
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="text-primary dark:text-emerald-400 font-black text-[10px] sm:text-xs">
            {currency}{product.price.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.cartQuantity === next.cartQuantity &&
    prev.isTouchMode === next.isTouchMode &&
    prev.currency === next.currency &&
    prev.gridCols === next.gridCols &&
    prev.product.id === next.product.id &&
    prev.product.name === next.product.name &&
    prev.product.price === next.product.price &&
    prev.product.stock === next.product.stock &&
    prev.product.image === next.product.image &&
    prev.product.active === next.product.active &&
    prev.product.isFeatured === next.product.isFeatured &&
    prev.product.trackInventory === next.product.trackInventory &&
    prev.product.minStock === next.product.minStock
  )
});
