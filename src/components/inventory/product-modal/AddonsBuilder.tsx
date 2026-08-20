import { X, Plus, Database } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { SearchableSelect } from '../../../shared/ui/SearchableSelect';
import type { Product, ProductAddon } from '../../../types';

interface AddonsBuilderProps {
  productAddons: ProductAddon[];
  setProductAddons: React.Dispatch<React.SetStateAction<ProductAddon[]>>;
  appProducts: Product[];
  product: Product | null;
}

export function AddonsBuilder({ productAddons, setProductAddons, appProducts, product }: AddonsBuilderProps) {
  return (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-surface rounded-2xl border border-gray-200 dark:border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase">Linked Add-ons</h4>
          <p className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">Attach inventory-tracked products as extras</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setProductAddons([...productAddons, { id: '', productId: product?.id || '', addonProductId: '', name: '', price: 0, maxQty: 1, active: true, createdAt: new Date() }])}
          className="!min-h-0 !px-3 !py-1.5 !rounded-lg !text-[10px] !font-black !bg-white dark:!bg-black !text-blue-600 dark:!text-blue-500 !border-gray-200 dark:!border-white/10 hover:!border-blue-500"
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Link
        </Button>
      </div>

      {productAddons.map((addon, index) => (
        <div key={index} className="flex flex-col sm:flex-row gap-2.5 p-3 bg-white dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/5 items-center">
          <div className="w-full sm:flex-1 min-w-0">
            <SearchableSelect
              options={appProducts.filter(p => p.id !== product?.id).map(p => ({
                id: p.id,
                label: `${p.name} (Stock: ${p.stock})`,
                image: p.image,
                sublabel: p.category
              }))}
              value={addon.addonProductId}
              onChange={(val) => {
                const selProd = appProducts.find(p => p.id === val);
                const newAddons = [...productAddons];
                newAddons[index].addonProductId = val;
                if (selProd) {
                  newAddons[index].name = selProd.name;
                  newAddons[index].price = selProd.price;
                }
                setProductAddons(newAddons);
              }}
              placeholder="Search Product to Link..."
              icon={Database}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
            <div className="relative flex-1 sm:flex-none w-full sm:w-24">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold z-10 uppercase">Max</span>
              <input
                type="number"
                min="1"
                value={addon.maxQty || ''}
                onChange={(e) => {
                  const newAddons = [...productAddons];
                  newAddons[index].maxQty = parseInt(e.target.value) || 1;
                  setProductAddons(newAddons);
                }}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg pl-11 pr-2 py-1.5 focus:ring-1 focus:ring-blue-500 font-bold text-gray-900 dark:text-white text-xs text-right sm:text-left"
              />
            </div>
            <div className="relative flex-1 sm:flex-none w-full sm:w-28">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold z-10 uppercase">Price</span>
              <input
                type="number"
                placeholder="0"
                value={addon.price === 0 ? '' : addon.price}
                onChange={(e) => {
                  const newAddons = [...productAddons];
                  newAddons[index].price = parseFloat(e.target.value) || 0;
                  setProductAddons(newAddons);
                }}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg pl-12 pr-2 py-1.5 focus:ring-1 focus:ring-blue-500 font-bold text-gray-900 dark:text-white text-xs text-right sm:text-left"
              />
            </div>
            <Button type="button" variant="ghost" onClick={() => setProductAddons(productAddons.filter((_, i) => i !== index))} className="!min-h-0 !p-1.5 !rounded-lg !bg-transparent !text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 shrink-0 mt-0.5" icon={<X className="w-4 h-4" />} />
          </div>
        </div>
      ))}
    </div>
  );
}
