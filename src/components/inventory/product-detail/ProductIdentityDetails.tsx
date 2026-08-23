import { BadgeInfo, Wand2, X, Camera } from 'lucide-react';
import { Button, SearchableSelect, SegmentedControl } from '../../../shared/ui';
import { BarcodePreview } from '../../../shared/ui/BarcodePreview';
import { ProductVariants } from './ProductVariants';
import { ProductStatus } from './ProductStatus';
import type { ProductDetailController } from './useProductDetail';

import { useInventoryStore } from '../../../stores/inventoryStore';

export function ProductIdentityDetails({ d }: { d: ProductDetailController }) {
  const { formData, setFormData, generateSku, generateBarcode, setActiveScannerField, setShowScanner } = d;
  const categories = useInventoryStore(s => s.categories);
  const suppliers = useInventoryStore(s => s.suppliers).map(s => s.name);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4">

      <div className="lg:col-span-8 bg-white dark:bg-[#1C1C1C] p-6 sm:p-8 rounded-[3rem] border border-gray-200 dark:border-white/5 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-[1.5rem]"><BadgeInfo className="w-6 h-6" /></div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{"Identity Details"}</h3>
            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{"Global product properties"}</p>
          </div>
        </div>
        <div className="space-y-6">
          <SegmentedControl
            options={[
              { value: 'simple', label: 'Simple Product' },
              { value: 'variable', label: 'Variable Product' },
            ]}
            value={formData.productType}
            onChange={(v) => setFormData(prev => ({ ...prev, productType: v }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <SearchableSelect
                label={'Category *'.replace(' *', '')}
                options={categories.map(c => ({ id: c, label: c }))}
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
              />
            </div>
            <div className="space-y-1.5">
              <SearchableSelect
                label={"SUPPLIER"}
                options={[{ id: '', label: 'NONE' }, ...suppliers.map(s => ({ id: s, label: s }))]}
                value={formData.supplier}
                onChange={(val) => setFormData({ ...formData, supplier: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest ml-1">{"SKU (Optional)"}</label>
              <div className="relative">
                <input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-50 dark:bg-black/30 border-none pl-5 pr-20 py-4 rounded-[1.5rem] text-sm font-mono outline-none ring-1 ring-gray-100 dark:ring-white/5 focus:ring-emerald-500/50"
                  placeholder={"ENTER SKU"}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {formData.sku && (
                    <Button
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, sku: '' })}
                      className="!min-h-0 !p-2 !bg-transparent !text-gray-600 hover:!text-rose-500"
                      icon={<X className="w-4 h-4" />}
                    />
                  )}
                  <Button
                    variant="ghost"
                    onClick={generateSku}
                    className="!min-h-0 !p-2.5 !rounded-2xl !bg-white dark:!bg-[#262626] !text-primary !shadow-sm hover:!scale-110"
                    title={"Generate Smart SKU"}
                    icon={<Wand2 className="w-4 h-4" />}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest ml-1">{"Barcode / EAN"}</label>
              <div className="relative">
                <input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-50 dark:bg-black/30 border-none pl-5 pr-32 py-4 rounded-[1.5rem] text-sm font-mono outline-none ring-1 ring-gray-100 dark:ring-white/5 focus:ring-emerald-500/50"
                  placeholder={"SCAN BARCODE"}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {formData.barcode && (
                    <Button
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, barcode: '' })}
                      className="!min-h-0 !p-2 !bg-transparent !text-gray-600 hover:!text-rose-500"
                      icon={<X className="w-4 h-4" />}
                    />
                  )}
                  <Button
                    variant="ghost"
                    onClick={generateBarcode}
                    className="!min-h-0 !p-2 !rounded-xl !bg-white dark:!bg-[#262626] !text-primary !shadow-sm hover:!scale-110 !border !border-primary/10"
                    title={"Generate Barcode"}
                    icon={<Wand2 className="w-4 h-4" />}
                  />
                  <Button
                    variant="ghost"
                    onClick={() => { setActiveScannerField('barcode'); setShowScanner(true); }}
                    className="!min-h-0 !p-2 !rounded-xl !bg-white dark:!bg-[#262626] !text-blue-500 !shadow-sm hover:!scale-110 !border !border-blue-500/10"
                    title={"Scan with Camera"}
                    icon={<Camera className="w-4 h-4" />}
                  />
                </div>
              </div>
              {formData.barcode && (
                <BarcodePreview value={formData.barcode} />
              )}
            </div>
          </div>
        </div>

        <ProductVariants d={d} />
      </div>

      <ProductStatus d={d} />

    </div>
  );
}
