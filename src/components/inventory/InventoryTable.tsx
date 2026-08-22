import { CheckSquare, MinusSquare, Square, Package, Star, Power, Trash2 } from 'lucide-react';
import { Button, Badge, Pagination } from '../../shared/ui';
import { BarcodePreview } from '../../shared/ui/BarcodePreview';
import { Product } from '../../types';
import { useSettingsStore } from '../../stores';
import { productsService } from '../../lib/services';
import { useProductsStore } from '../../stores';
import { formatCurrency } from '../../lib/currencies';
import { sonner } from '../../lib/sonner';

interface InventoryTableProps {
  paginatedProducts: Product[];
  selectedProductIds: string[];
  filteredProducts: Product[];
  handleSelectAll: () => void;
  handleSelectProduct: (id: string) => void;
  handleEditProduct: (product: Product) => void;
  handleDeleteProduct: (productId: string) => void;
  currentPage: number;
  totalPages: number;
  ITEMS_PER_PAGE: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  isAdmin: boolean;
  profile: any;
  canManageStock: boolean;
}

export function InventoryTable({
  paginatedProducts,
  selectedProductIds,
  filteredProducts,
  handleSelectAll,
  handleSelectProduct,
  handleEditProduct,
  handleDeleteProduct,
  currentPage,
  totalPages,
  ITEMS_PER_PAGE,
  onPageChange,
  onPageSizeChange,
  isAdmin,
  profile,
  canManageStock,
}: InventoryTableProps) {
  const appSettings = useSettingsStore(s => s.settings);

  return (
    <div className="bg-white dark:bg-surface rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5">
              <th className="p-4 w-12 cursor-pointer" onClick={handleSelectAll}>
                {selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length
                  ? <CheckSquare className="h-5 w-5 text-primary" />
                  : selectedProductIds.length > 0
                    ? <MinusSquare className="h-5 w-5 text-emerald-400" />
                    : <Square className="h-5 w-5 text-gray-600" />}
              </th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-left w-[32%]">{"ITEM"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-left hidden lg:table-cell w-[20%]">{"IDENTIFIER"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-center hidden lg:table-cell w-[14%]">{"BARCODE"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-left w-[13%]">{"PRICING"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-center w-[11%]">{"STOCK STATUS"}</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest text-right w-[10%]">{"Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/5">
            {paginatedProducts.map(product => (
              <tr key={product.id} className={`group hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors ${selectedProductIds.includes(product.id) ? 'bg-primary/5' : ''} ${!product.active ? 'opacity-50' : ''}`}>
                <td className="p-4 cursor-pointer" onClick={() => handleSelectProduct(product.id)}>
                  {selectedProductIds.includes(product.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-gray-600" />}
                </td>
                <td className="p-4 text-left">
                  <div className="flex items-center gap-4 cursor-pointer group" onClick={() => handleEditProduct(product)}>
                    <div className="h-10 w-10 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border border-white/5 shadow-inner shrink-0">
                      {product.image ? <img src={product.image} className="h-full w-full object-cover transition-transform group-hover:scale-110" /> : <Package className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-gray-900 dark:text-white uppercase text-xs truncate max-w-[200px] group-hover:text-primary transition-colors">{product.name} {product.isFeatured && <Star className="h-2.5 w-2.5 inline text-yellow-500 fill-yellow-500 mb-1" />}</p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase truncate">{product.category}{product.supplier ? ` · ${product.supplier}` : ''}</p>
                      {(product.isService || product.requireSerial) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.isService && <Badge tone="info" className="!bg-blue-500/10 !text-blue-500 !px-1.5 !py-0.5 !rounded !text-[8px] !leading-none">Service</Badge>}
                          {product.requireSerial && <Badge tone="warning" className="!bg-amber-500/10 !text-amber-500 !px-1.5 !py-0.5 !rounded !text-[8px] !leading-none">IMEI/SN Req</Badge>}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="p-4 text-left font-mono text-[10px] text-gray-600 hidden lg:table-cell">
                  <div className="truncate max-w-[150px] xl:max-w-[180px]" title={product.sku}>
                    {product.sku}
                  </div>
                </td>
                <td className="p-4 text-center hidden lg:table-cell">
                  <div className="inline-flex justify-center w-full">
                    <BarcodePreview value={product.barcodeValue || product.barcode || ''} inline={true} />
                  </div>
                </td>
                <td className="p-4 text-left">
                  <p className="text-xs font-black text-gray-900 dark:text-white tracking-widest">{formatCurrency(product.price, appSettings.currency)}</p>
                  {(true) && <p className="text-[9px] text-gray-600 uppercase font-black opacity-50">Cost: {formatCurrency(product.cost || 0, appSettings.currency)}</p>}
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {product.trackInventory === false || product.stock >= 990000 ? (
                      <Badge tone="neutral" className="!bg-violet-500/10 !text-violet-600 dark:!text-violet-400 !px-2 !py-0.5 !rounded-full !text-[10px]">∞</Badge>
                    ) : (
                      <Badge variant={product.stock <= 0 ? 'solid' : product.stock <= (product.minStock || 5) ? 'solid' : 'soft'} tone={product.stock <= 0 ? 'danger' : product.stock <= (product.minStock || 5) ? 'warning' : 'success'} className={`!px-2 !py-0.5 !rounded-full !text-[10px] ${product.stock <= 0 ? '!bg-red-500 !shadow-sm !ring-1 !ring-red-600' : product.stock <= (product.minStock || 5) ? '!bg-amber-500 !shadow-sm !ring-1 !ring-amber-600' : '!bg-primary/10 !text-primary dark:!text-emerald-400'}`}>{product.stock}</Badge>
                    )}
                    {!product.active && <Badge tone="neutral" className="!bg-gray-200 dark:!bg-white/10 !px-1.5 !py-0.5 !rounded !text-[8px] !text-gray-600 dark:!text-gray-400">Disabled</Badge>}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end items-center gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Enable / Disable Toggle */}
                    {(isAdmin || profile?.canManageStock) && (
                      <Button
                        variant="ghost"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            // Send only the toggled field — never spread product (avoids
                            // writing products.stock directly to cloud; AGENTS.md hard limit).
                            const updated = { id: product.id, active: !product.active, updatedAt: new Date() };
                            await productsService.update(product.id, updated);
                            useProductsStore.getState().updateProduct(updated);
                            sonner.success(updated.active ? 'Product enabled' : 'Product disabled');
                          } catch {
                            sonner.error('Failed to toggle product status');
                          }
                        }}
                        className={`!min-h-0 !p-2 !rounded-xl hover:!scale-110 ${product.active ? '!bg-primary/10 !text-primary' : '!bg-gray-200 dark:!bg-white/10 !text-gray-500'}`}
                        title={product.active ? 'Disable Product' : 'Enable Product'}
                        icon={<Power className="h-3.5 w-3.5" />}
                      />
                    )}
                    {/* Featured Toggle */}
                    <Button
                      variant="ghost"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newStatus = !product.isFeatured;
                        try {
                          const updated = { id: product.id, isFeatured: newStatus, updatedAt: new Date() };
                          await productsService.update(product.id, updated);
                          useProductsStore.getState().updateProduct(updated);
                        } catch (error) {
                          sonner.error('Failed to toggle featured status');
                        }
                      }}
                      className={`!min-h-0 !p-2 !rounded-xl hover:!scale-110 ${product.isFeatured ? '!bg-yellow-500/10 !text-yellow-500 !shadow-sm' : '!bg-gray-100 dark:!bg-white/5 !text-gray-600 hover:!text-yellow-500'}`}
                      title={product.isFeatured ? 'Unmark Featured' : 'Mark as Featured'}
                      icon={<Star className={`h-3.5 w-3.5 ${product.isFeatured ? 'fill-yellow-500' : ''}`} />}
                    />
                    {(isAdmin || profile?.canManageStock) && (
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                        className="!min-h-0 !p-2 !rounded-xl !bg-red-50 dark:!bg-red-500/10 !text-red-600 hover:!scale-110"
                        title="Delete Product"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Expert Density) */}
      <div className="lg:hidden p-3 sm:p-4">
        {/* Select All on Mobile */}
        {paginatedProducts.length > 0 && (
          <div className="flex items-center justify-between mb-3 bg-gray-50/50 dark:bg-white/[0.02] p-2 rounded-xl">
            <Button
              variant="ghost"
              onClick={handleSelectAll}
              className="!min-h-0 !p-0 !bg-transparent !text-[10px] !font-black !text-gray-600 dark:!text-gray-400"
            >
              {selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : selectedProductIds.length > 0
                  ? <MinusSquare className="h-4 w-4 text-emerald-400" />
                  : <Square className="h-4 w-4 text-gray-600" />}
              Select All
            </Button>
            <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{selectedProductIds.length} {"Selected"}</span>
          </div>
        )}
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-10 text-gray-600 font-bold uppercase tracking-widest text-xs">{"No products found"}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {paginatedProducts.map(product => (
              <div
                key={product.id}
                onClick={() => handleEditProduct(product)}
                className={`relative flex flex-col p-2.5 sm:p-4 rounded-[1.5rem] bg-white dark:bg-surface border border-gray-200 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all group ${selectedProductIds.includes(product.id) ? 'ring-2 ring-emerald-500 bg-primary/5' : ''}`}
              >
                {/* Selection Toggle */}
                <Button
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); handleSelectProduct(product.id); }}
                  className="absolute top-1.5 right-1.5 z-20 !min-h-0 !p-0 !bg-transparent hover:!scale-100 active:!scale-100"
                >
                  {selectedProductIds.includes(product.id) ? (
                    <div className="bg-primary rounded-lg p-1.5 shadow-lg shadow-emerald-500/30">
                      <CheckSquare className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="bg-white/90 dark:bg-black/75 rounded-lg p-1.5 border border-gray-200 dark:border-white/20 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Square className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                  )}
                </Button>

                <div className="flex flex-col gap-2.5">
                  <div className="aspect-square w-full bg-gray-50 dark:bg-[#0F0F0F] rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/5 flex-shrink-0 relative">
                    {product.image ? (
                      <img src={product.image} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-gray-600" />
                    )}
                    {product.isFeatured && (
                      <div className="absolute bottom-1 right-1 bg-yellow-500 rounded-md p-1 shadow-md">
                        <Star className="h-2 w-2 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col">
                    <h3 className="font-black text-gray-900 dark:text-white uppercase text-[10px] leading-tight truncate">
                      {product.name}
                    </h3>
                    <p className="text-[8px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-tight truncate mb-1">
                      {product.category}
                    </p>
                    {(product.isService || product.requireSerial || !product.active) && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {product.isService && <Badge tone="info" className="!bg-blue-500/10 !text-blue-500 !px-1 !py-0.5 !rounded !text-[7px] !leading-none">Service</Badge>}
                        {product.requireSerial && <Badge tone="warning" className="!bg-amber-500/10 !text-amber-500 !px-1 !py-0.5 !rounded !text-[7px] !leading-none">IMEI / SN</Badge>}
                        {!product.active && <Badge tone="neutral" className="!bg-gray-200 dark:!bg-white/10 !text-gray-600 dark:!text-gray-400 !px-1 !py-0.5 !rounded !text-[7px] !leading-none">Disabled</Badge>}
                      </div>
                    )}

                    <div className="mt-auto space-y-1.5 pt-1.5 border-t border-gray-200 dark:border-white/5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] font-black text-primary">
                          {formatCurrency(product.price, appSettings.currency)}
                        </p>
                        <Badge variant={product.stock <= 0 ? 'solid' : product.stock <= (product.minStock || 5) ? 'solid' : 'soft'} tone={product.stock <= 0 ? 'danger' : product.stock <= (product.minStock || 5) ? 'warning' : 'success'} className={`!px-1.5 !py-0.5 !rounded-md !text-[8px] ${product.stock <= 0 ? '!bg-red-500 !text-white' : product.stock <= (product.minStock || 5) ? '!bg-amber-500 !text-white' : '!bg-primary/10 !text-primary'}`}>
                          {product.trackInventory === false || product.stock >= 990000 ? '∞' : product.stock}
                        </Badge>
                      </div>
                      {(true) && (
                        <div className="flex items-center justify-between opacity-50">
                          <span className="text-[7px] font-black text-gray-600 dark:text-gray-500 uppercase">{"Cost"}</span>
                          <span className="text-[7px] font-black text-gray-600 dark:text-gray-400">{formatCurrency(product.cost || 0, appSettings.currency)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      
        <div className="p-4 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/5 flex items-center justify-between gap-4">
          <p className="hidden sm:block text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest italic truncate">Items {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}</p>
          <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredProducts.length}
              onPageChange={(p) => { onPageChange(p); }}
              siblingCount={1}
            
              pageSize={ITEMS_PER_PAGE}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        </div>
      
    </div>
  );
}
