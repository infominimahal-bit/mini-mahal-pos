import React from 'react';
import { PackageOpen, TrendingDown, Building2, Trash2, Filter, CheckCircle2 } from 'lucide-react';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { Button, Badge, ToggleSwitch } from '../../shared/ui';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { usePurchaseOrder } from './usePurchaseOrder';

export function PurchaseOrderSystem() {
  const {
    appProducts,
    appSuppliers,
    appSettings,
    appCategories,
    isAdmin,
    poMode,
    setPoMode,
    selectedSupplier,
    setSelectedSupplier,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    isGenerated,
    setIsGenerated,
    activeList,
    totalItemsNeeded,
    estimatedCost,
    paginatedList,
    totalPages,
    searchQuery,
    setSearchQuery,
    batchSupplier,
    setBatchSupplier,
    batchCategory,
    setBatchCategory,
    showScanner,
    setShowScanner,
    manualList,
    setManualList,
    setAutoOverrides,
    recordAsSupplierBill,
    setRecordAsSupplierBill,
    exportColumns,
    exportRows,
    handleFilterChange,
    handleGenerate,
    handleBulkAdmit,
    handleReset
  } = usePurchaseOrder();

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

      <div className="print-hide bg-white dark:bg-surface p-6 lg:p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-2xl relative">
        <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <PackageOpen className="w-48 h-48 -mr-12 -mt-12" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-50 dark:border-white/5 pb-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner border border-primary/10 shrink-0">
                <PackageOpen className="h-7 w-7 text-primary" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                  {"PO Generation"}
                </h2>
                <div className="flex gap-2 mt-2">
                  <Badge tone="success" size="sm" className="!bg-primary/10 !text-[#10B981] !border-primary/20 !text-[10px] !px-2 !py-0.5 !rounded-md">{"System Center"}</Badge>
                </div>
              </div>
            </div>

            <div className="flex bg-gray-100/80 dark:bg-black/75 p-1.5 rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-inner w-full sm:w-fit">
              {[
                { id: 'auto', label: "Auto (Reorder)" },
                { id: 'manual', label: "Manual (Custom)" }
              ].map(mode => {
                const isActive = poMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => { setPoMode(mode.id as any); setIsGenerated(false); }}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 relative overflow-hidden z-10 active:scale-95 ${isActive
                      ? 'text-primary'
                      : 'text-gray-600 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-white dark:bg-[#1f1f1f] border border-gray-200/50 dark:border-white/10 rounded-xl shadow-lg -z-10 animate-in zoom-in-95 duration-200" />
                    )}
                    <span className="relative z-10">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-black/20 px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm transition-all h-[54px]">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-[140px]">
                <SearchableSelect
                  label={"SUPPLIER"}
                  options={[{ id: 'All', label: "All Suppliers" }, ...appSuppliers.map(s => ({ id: s.name, label: s.name }))]}
                  value={selectedSupplier}
                  onChange={setSelectedSupplier}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-black/20 px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm transition-all h-[54px]">
              <Filter className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-[140px]">
                <SearchableSelect
                  label={"CATEGORY"}
                  options={[{ id: 'All', label: "All Categories" }, ...appCategories.map(c => ({ id: c.name, label: c.name }))]}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 h-[54px]">
              <Button
                onClick={handleReset}
                variant="secondary"
                className="flex-1 h-full !bg-gray-50 dark:!bg-black/20 !text-gray-600 hover:!text-rose-500 hover:!bg-gray-50 dark:hover:!bg-black/20 !border-gray-200 dark:!border-white/5 !rounded-2xl !px-4 !text-[10px] !font-black"
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                {"RESET"}
              </Button>
            </div>

            <Button
              onClick={handleGenerate}
              variant="primary"
              size="md"
              className="h-[54px]"
              icon={<TrendingDown className="h-4 w-4" />}
            >
              {"PREVIEW PO"}
            </Button>
          </div>

          {isGenerated && activeList.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200 dark:border-white/5 animate-in slide-in-from-top-2 duration-300">
              <Button
                onClick={handleBulkAdmit}
                variant="primary"
                className="!bg-blue-600 hover:!bg-blue-700 !px-6 !py-3 !rounded-2xl !font-black !text-[10px] !gap-3 !shadow-xl !shadow-blue-500/20"
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                {"COMMIT & ADD TO STOCK"}
              </Button>

              <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/5">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest whitespace-nowrap">{"Supplier Bill"}</span>
                <ToggleSwitch
                  checked={recordAsSupplierBill}
                  onChange={setRecordAsSupplierBill}
                  size="sm"
                  color="bg-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <PurchaseOrderForm
        isGenerated={isGenerated}
        poMode={poMode}
        activeList={activeList}
        totalItemsNeeded={totalItemsNeeded}
        estimatedCost={estimatedCost}
        selectedSupplier={selectedSupplier}
        selectedCategory={selectedCategory}
        appSettings={appSettings}
        paginatedList={paginatedList}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isAdmin={isAdmin}
        appProducts={appProducts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        batchSupplier={batchSupplier}
        batchCategory={batchCategory}
        showScanner={showScanner}
        setShowScanner={setShowScanner}
        manualList={manualList}
        setManualList={setManualList}
        setAutoOverrides={setAutoOverrides}
        setIsGenerated={setIsGenerated}
        exportColumns={exportColumns}
        exportRows={exportRows}
      />

      <style>{`
        @media print {
          body, html {
            background: white !important;
            color: black !important;
          }
          .print-hide { display: none !important; }
          #root { height: auto !important; overflow: auto !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
