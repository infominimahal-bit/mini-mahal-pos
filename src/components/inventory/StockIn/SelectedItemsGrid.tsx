import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { SearchableSelect } from '../../../shared/ui/SearchableSelect';

interface Props {
  selectedItems: any[];
  updateItem: (id: string, field: string, value: any) => void;
  removeItem: (id: string) => void;
}

export function SelectedItemsGrid({ selectedItems, updateItem, removeItem }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-[11px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
        <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
        {'Staging Matrix'.replace('{count}', selectedItems.length.toString())}
      </h3>
      <div className="bg-white dark:bg-surface rounded-[2rem] border border-gray-200 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/[0.02]">
                <th className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">{'PRODUCT'}</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">{'SUPPLIER'}</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">{'VARIANT'}</th>
                <th className="px-6 py-4 text-[9px] font-black text-primary uppercase tracking-[0.2em] text-center">{'QTY'}</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] text-right">{'COST'}</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] text-right">{'RETAIL'}</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] text-center">{'ACT'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {selectedItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all">
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-tight">{item.name}</p>
                    <p className="text-[9px] font-bold text-gray-600 uppercase mt-0.5">{item.sku || 'SKU_UNKNOWN'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={item.batchSupplier}
                      onChange={(e) => updateItem(item.id, 'batchSupplier', e.target.value)}
                      className="w-full bg-[#f8f9fa] dark:bg-black/20 border-none rounded-lg px-3 py-2 text-[10px] font-black text-gray-900 dark:text-white uppercase"
                      placeholder={'Direct Entry'}
                    />
                  </td>
                  <td className="px-6 py-4 min-w-[170px]">
                    {(item.variantData || []).some((vd: any) => vd.trackInventory !== false) ? (
                      <SearchableSelect
                        options={[
                          { id: '__general__', label: 'GENERAL STOCK' },
                          ...(item.variantData || []).map((vd: any) => ({
                            id: vd.id,
                            label: `${vd.option1 || ''}${vd.option2 ? ` / ${vd.option2}` : ''}`,
                            sublabel: vd.stock !== undefined ? `Stock: ${vd.stock}` : undefined
                          }))
                        ]}
                        value={item.variantId || '__general__'}
                        onChange={(val) => {
                          const vd = (item.variantData || []).find((v: any) => v.id === val);
                          updateItem(item.id, 'variantId', val === '__general__' ? undefined : val);
                          updateItem(item.id, 'variantLabel', val === '__general__' ? undefined : (vd ? `${vd.option1 || ''}${vd.option2 ? ` / ${vd.option2}` : ''}` : undefined));
                        }}
                      />
                    ) : (
                      <span className="text-[9px] font-black text-gray-400 uppercase">{'General'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-16 bg-primary/10 border-none rounded-lg px-2 py-2 text-center text-xs font-black text-primary dark:text-emerald-400"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="number"
                      value={item.costPrice}
                      onChange={(e) => updateItem(item.id, 'costPrice', Number(e.target.value))}
                      className="w-20 bg-[#f8f9fa] dark:bg-black/20 border-none rounded-lg px-2 py-2 text-right text-xs font-black text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="number"
                      value={item.retailPrice}
                      onChange={(e) => updateItem(item.id, 'retailPrice', Number(e.target.value))}
                      className="w-20 bg-[#f8f9fa] dark:bg-black/20 border-none rounded-lg px-2 py-2 text-right text-xs font-black text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button onClick={() => removeItem(item.id)} variant="ghost" className="!min-h-0 !p-2 !text-rose-500 hover:!bg-rose-500/10 !rounded-lg" icon={<Trash2 className="h-4 w-4" />} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
