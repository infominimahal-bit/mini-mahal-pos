import React from 'react';
import { PackageOpen, TrendingDown } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../lib/currencies';
import { SharedSearchBar, SharedProductList, SharedItem } from '../../shared/modules/search-and-list';
import { ExportButton } from '../../shared/export';
import { CameraScanner } from '../../shared/ui/CameraScanner';
import { sonner } from '../../lib/sonner';
import { usePurchaseOrderFormHandlers } from './usePurchaseOrderFormHandlers';
import { PurchaseOrderFormTable } from './PurchaseOrderForm.table';
import type { PurchaseOrderFormProps } from './PurchaseOrderForm.types';

export function PurchaseOrderForm({
  isGenerated,
  poMode,
  activeList,
  totalItemsNeeded,
  estimatedCost,
  selectedSupplier,
  selectedCategory,
  appSettings,
  paginatedList,
  totalPages,
  currentPage,
  setCurrentPage,
  isAdmin,
  appProducts,
  searchQuery,
  setSearchQuery,
  _batchSupplier,
  _batchCategory,
  showScanner,
  setShowScanner,
  manualList,
  setManualList,
  setAutoOverrides,
  setIsGenerated,
  exportColumns,
  exportRows,
}: PurchaseOrderFormProps) {
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    let base = appProducts.filter(p => p.active);
    if (selectedSupplier !== 'All') {
      if (selectedSupplier === 'Unassigned') {
        base = base.filter(p => !p.supplier);
      } else {
        base = base.filter(p => p.supplier === selectedSupplier);
      }
    }
    if (selectedCategory !== 'All') {
      base = base.filter(p => p.category === selectedCategory);
    }
    return base
      .filter(p => (
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
      ))
      .slice(0, 15);
  }, [appProducts, searchQuery, selectedSupplier, selectedCategory]);
  const sharedSearchResults = React.useMemo<SharedItem[]>(() => {
    return searchResults.map(p => ({
      id: p.id,
      thumbnailUrl: p.image || undefined,
      badgeLabel: p.category || 'GENERAL',
      sku: p.sku || 'N/A',
      title: p.name,
      stock: p.stock,
      tag: p.supplier || 'DIRECT',
    }));
  }, [searchResults]);
  const sharedManualIds = React.useMemo(() => manualList.map(m => m.id), [manualList]);

  const {
    updateItem,
    addAllToManual,
    addToManualList,
    removeFromManualList,
    handleRemoveFromPO
  } = usePurchaseOrderFormHandlers({
    poMode,
    manualList,
    setManualList,
    setAutoOverrides,
    setIsGenerated,
    appProducts
  });

  return (
    <>
      {isGenerated && activeList.length > 0 && (
        <div className="print-hide flex flex-wrap items-center gap-3 pt-4 animate-in slide-in-from-top-2 duration-300">
          <ExportButton
            data={exportRows}
            columns={exportColumns}
            title="Purchase Order"
            subtitle={`${poMode === 'auto' ? `Supplier: ${selectedSupplier}` : 'Manual Selection'} • ${activeList.length} items • Est. ${formatCurrency(estimatedCost, appSettings.currency)}`}
            currencySymbol={getCurrencySymbol(appSettings.currency)}
            compact
          />
        </div>
      )}
      <div className={`transition-all duration-500 ${poMode === 'auto' ? 'hidden' : 'block'}`}>
        <div className="flex flex-col gap-4">
          {searchResults.length > 0 && (
            <SharedProductList
              items={sharedSearchResults}
              selectedIds={sharedManualIds}
              onItemAdd={(item) => {
                const product = appProducts.find(p => p.id === item.id);
                if (product) addToManualList(product);
              }}
              onClearSearch={() => setSearchQuery('')}
              headerTitle={"Smart Match Results"}
              maxHeight="350px"
              emptyStateText={"NO ITEMS SELECTED YET"}
            />
          )}
          <div className="bg-gray-100 dark:bg-black/75 p-4 rounded-[1.5rem] border border-gray-200 dark:border-white/5 focus-within:border-primary/50 transition-all shadow-inner">
            <SharedSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={"Type to search & add..."}
              onScanClick={() => setShowScanner(true)}
              onAddAll={() => addAllToManual(searchResults)}
              resultsCount={searchResults.length}
            />
          </div>
        </div>
      </div>
      {(isGenerated || (poMode === 'manual')) && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {activeList.length > 0 && (
            <div className="print-hide grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-primary p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <PackageOpen className="h-40 w-40" />
                </div>
                <div className="z-10">
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/70 mb-2">{"Total Items to Order"}</p>
                  <p className="text-4xl font-black">{totalItemsNeeded.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-rose-500 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <TrendingDown className="h-40 w-40" />
                </div>
                <div className="z-10">
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/70 mb-2">{"Estimated Restock Cost"}</p>
                  <p className="text-4xl font-black">{formatCurrency(estimatedCost, appSettings.currency)}</p>
                </div>
              </div>
            </div>
          )}
          <PurchaseOrderFormTable
            activeList={activeList}
            totalItemsNeeded={totalItemsNeeded}
            paginatedList={paginatedList}
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isAdmin={isAdmin}
            isGenerated={isGenerated}
            poMode={poMode}
            selectedSupplier={selectedSupplier}
            selectedCategory={selectedCategory}
            estimatedCost={estimatedCost}
            appSettings={appSettings}
            updateItem={updateItem}
            handleRemoveFromPO={handleRemoveFromPO}
            removeFromManualList={removeFromManualList}
          />
        </div>
      )}

      {showScanner && (
        <CameraScanner
          onScan={(code) => {
            const term = code.trim();
            setSearchQuery(term);
            const normalizedTerm = term.toUpperCase().replace(/O/g, '0');

            let found = appProducts.find(
              (p: any) => p.barcode === term || p.sku === term
            );

            if (!found) {
              found = appProducts.find((p: any) => {
                const pBarcode = (p.barcode || '').toUpperCase().replace(/O/g, '0');
                const pSku = (p.sku || '').toUpperCase().replace(/O/g, '0');
                return pBarcode === normalizedTerm || pSku === normalizedTerm;
              });
            }

            if (found) {
              addToManualList(found);
              setShowScanner(false);
              sonner.success(`Added: ${found.name}`);
            } else {
              sonner.error(`Product not found: ${term}`);
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
