import React from 'react';
import { Layers } from 'lucide-react';
import { Badge, Button } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import { Product } from '../../../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  categories: string[];
  appProducts: Product[];
  appSettings: any;
  setSelectedCategory: (cat: string) => void;
}

export function CategoriesList({ categories, appProducts, appSettings, setSelectedCategory }: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-surface rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
                <th className="p-4 text-xs font-bold uppercase text-gray-600 tracking-widest text-center">Identity</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-600 tracking-widest text-center">Items</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-600 tracking-widest text-center">Total Stock</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-600 tracking-widest text-center">In Stock Value</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-600 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {categories.filter(c => c !== 'All').map(cat => {
                const productsInCat = appProducts.filter(p => p.category === cat);
                const stockInCat = productsInCat.reduce((sum, p) => sum + (p.trackInventory === false || p.stock >= 990000 ? 0 : (p.stock || 0)), 0);
                const valueInCat = productsInCat.reduce((sum, p) => sum + (p.trackInventory === false || p.stock >= 990000 ? 0 : ((p.stock || 0) * (p.cost || 0))), 0);

                return (
                  <tr key={cat} className="group hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-emerald-50 dark:bg-primary/10 rounded-xl flex items-center justify-center">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-black text-gray-900 dark:text-white uppercase text-xs">{cat}</p>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-gray-700 dark:text-gray-300">{productsInCat.length} Products</td>
                    <td className="p-4 text-center">
                      <Badge tone="info" className="!bg-blue-50 dark:!bg-blue-500/10 !text-blue-600 !px-3 !py-1 !rounded-full !text-[10px]">{stockInCat}</Badge>
                    </td>
                    <td className="p-4 text-center font-black text-gray-900 dark:text-white">{formatCurrency(valueInCat, appSettings.currency)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        onClick={() => { setSelectedCategory(cat); navigate('/inventory/products'); }}
                        className="!min-h-0 !p-0 !bg-transparent !text-[10px] !font-black !text-primary hover:!underline !tracking-normal"
                      >
                        View All
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 pt-2 md:hidden">
          {categories.filter(c => c !== 'All').map(cat => {
            const productsInCat = appProducts.filter(p => p.category === cat);
            const stockInCat = productsInCat.reduce((sum, p) => sum + (p.trackInventory === false || p.stock >= 990000 ? 0 : (p.stock || 0)), 0);
            const valueInCat = productsInCat.reduce((sum, p) => sum + (p.trackInventory === false || p.stock >= 990000 ? 0 : ((p.stock || 0) * (p.cost || 0))), 0);

            return (
              <div key={cat} onClick={() => { setSelectedCategory(cat); navigate('/inventory/products'); }} className="p-4 bg-gray-50 dark:bg-black/20 rounded-[2rem] border border-gray-200 dark:border-white/5 active:scale-95 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-black text-gray-900 dark:text-white uppercase text-xs">{cat}</p>
                  </div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">VIEW →</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 text-center">
                    <p className="text-[8px] font-black text-gray-600 uppercase mb-0.5">Items</p>
                    <p className="text-xs font-black text-gray-900 dark:text-white">{productsInCat.length}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 text-center">
                    <p className="text-[8px] font-black text-gray-600 uppercase mb-0.5">Stock</p>
                    <p className="text-xs font-black text-blue-500">{stockInCat}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 text-center col-span-1">
                    <p className="text-[8px] font-black text-gray-600 uppercase mb-0.5">Value</p>
                    <p className="text-[10px] font-black text-gray-900 dark:text-white truncate">{formatCurrency(valueInCat, appSettings.currency)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
