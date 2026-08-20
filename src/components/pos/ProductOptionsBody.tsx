import { Product, ProductVariant, CartAddonItem, ProductAddon } from '../../types';
import { Plus, Minus } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';

interface ProductOptionsBodyProps {
  product: Product;
  appProducts: any[];
  appSettings: any;
  childVariations: Product[];
  selectedVariationChildId: string;
  setSelectedVariationChildId: (id: string) => void;
  selectedVariants: Record<string, string>;
  setSelectedVariants: (v: Record<string, string>) => void;
  addonItems: CartAddonItem[];
  updateAddonQuantity: (addon: ProductAddon, delta: number) => void;
  serialNumber: string;
  setSerialNumber: (v: string) => void;
}

export function ProductOptionsBody({ product, appProducts, appSettings, childVariations, selectedVariationChildId, setSelectedVariationChildId, selectedVariants, setSelectedVariants, addonItems, updateAddonQuantity, serialNumber, setSerialNumber }: ProductOptionsBodyProps) {
  return (
    <div className="space-y-6">

      {product.productType === 'variable' && childVariations.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-2">
            {"Select Variation"}
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {childVariations.map(child => {
              const isOutOfStock = child.trackInventory && child.stock <= 0;
              return (
                <button
                  key={child.id}
                  onClick={() => !isOutOfStock && setSelectedVariationChildId(child.id)}
                  disabled={isOutOfStock}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedVariationChildId === child.id
                      ? 'bg-primary text-white border-primary shadow-md shadow-emerald-500/20'
                      : isOutOfStock
                        ? 'bg-gray-100 dark:bg-black/60 border-gray-200 dark:border-white/5 opacity-60 grayscale cursor-not-allowed'
                        : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase">{child.name.replace(`${product.name} - `, '')}</span>
                    <span className="text-[10px] font-bold tracking-widest">
                      {formatCurrency(child.price, appSettings.currency)}
                    </span>
                  </div>
                  {child.trackInventory && (
                    <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
                      selectedVariationChildId === child.id ? 'text-emerald-100' : isOutOfStock ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {isOutOfStock ? 'Out of Stock' : `Stock: ${child.stock}`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : product.variants && product.variants.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-2">
            {"Select Variants"}
          </h4>
          {product.variants.map((variant: ProductVariant) => (
            <div key={variant.name} className="space-y-2">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase">{variant.name}</label>
              <div className="flex flex-wrap gap-2">
                {variant.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedVariants({ ...selectedVariants, [variant.name]: opt })}
                    className={`px-4 py-2 text-xs font-black uppercase rounded-lg border transition-all ${
                      selectedVariants[variant.name] === opt
                        ? 'bg-primary text-white border-primary shadow-md shadow-emerald-500/20'
                        : 'bg-white dark:bg-black text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-primary'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {product.productAddons && product.productAddons.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-2">
            {"Add-ons & Extras"}
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {product.productAddons
              .filter(addon => addon.active)
              .map((addon) => {
                const cartItem = addonItems.find(item => item.addon.id === addon.id);
                const quantity = cartItem ? cartItem.quantity : 0;
                const addonProduct = appProducts.find(p => p.id === addon.addonProductId);
                const isOutOfStock = addonProduct?.trackInventory && (addonProduct.stock || 0) <= 0;

                return (
                  <div
                    key={addon.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      quantity > 0
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-primary shadow-sm'
                        : isOutOfStock
                          ? 'bg-gray-100 dark:bg-black/60 border-gray-200 dark:border-white/5 opacity-60 grayscale'
                          : 'bg-gray-50 dark:bg-black/40 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-xs font-black uppercase ${quantity > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {addon.name}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                        +{formatCurrency(addon.price, appSettings.currency)} {isOutOfStock ? '(Out of Stock)' : ''}
                      </span>
                    </div>

                    {!isOutOfStock && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white dark:bg-black/60 rounded-lg border border-gray-200 dark:border-white/10 p-0.5 shadow-sm">
                          <button
                            onClick={() => updateAddonQuantity(addon, -1)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-gray-900 dark:text-white">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateAddonQuantity(addon, 1)}
                            disabled={quantity >= addon.maxQty}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {product.requireSerial && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-2">
            {"Device Registration"}
          </h4>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase">{"Serial Number / IMEI *"}</label>
            <input
              type="text"
              autoFocus
              placeholder={"Scan or type serial number..."}
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
              className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 uppercase font-black tracking-widest placeholder:text-gray-400 placeholder:font-medium placeholder:normal-case"
            />
          </div>
        </div>
      )}

    </div>
  );
}
