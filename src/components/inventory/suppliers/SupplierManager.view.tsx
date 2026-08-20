import { Plus, Edit, Trash2, Phone, Mail, MapPin, Briefcase, Wallet, ArrowRight, User, Truck, CreditCard, Receipt } from 'lucide-react';
import { SharedSearchBar } from '../../../shared/modules/search-and-list';
import { formatCurrency } from '../../../lib/currencies';
import { SupplierLedger } from './SupplierLedger';
import { SupplierModal } from './SupplierModal';
import { Button, EmptyState, DateRangePicker, Pagination } from '../../../shared/ui';
import { useSupplierManagerLogic } from './useSupplierManagerLogic';

export function SupplierManager() {
  const {
    appSuppliers,
    appSettings,
    isAdmin,
    canManage,
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    startDateInput,
    setStartDateInput,
    endDateInput,
    setEndDateInput,
    selectedSupplierId,
    setSelectedSupplierId,
    totalRemaining,
    isModalOpen,
    setIsModalOpen,
    editingSupplier,
    activeSuppliers,
    filteredSuppliers,
    page,
    totalPages,
    pageItems,
    goToPage,
    pageSize,
    setPageSize,
    handleAddEdit,
    handleSaveSupplier,
    handleDelete,
    validStartDate,
    validEndDate,
  } = useSupplierManagerLogic();

  const selectedSupplier = selectedSupplierId
    ? appSuppliers.find(s => s.id === selectedSupplierId) ?? null
    : null;

  return (
    <>
      {/* ─── Supplier Ledger (stays mounted across syncs) ─── */}
      {selectedSupplierId && selectedSupplier && (
        <SupplierLedger
          supplier={selectedSupplier}
          onBack={() => setSelectedSupplierId(null)}
          startDate={validStartDate}
          endDate={validEndDate}
          dateFilter={dateFilter}
        />
      )}

      {/* ─── Supplier List (hidden when ledger is open) ─── */}
      {!selectedSupplierId && (
        <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-6 max-w-[1400px] mx-auto">
      {/* Layer 1: Identity & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 xl:gap-10">
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner border border-primary/10">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="shrink-0 flex flex-col">
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{"Suppliers"}</h1>
              <p className="hidden sm:block text-gray-600 dark:text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">{"Supply Network • Partners"} • {appSuppliers.length}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => handleAddEdit()}
            className="!px-5 !py-2.5 !text-[10px] !font-black !rounded-xl !shadow-lg !shadow-emerald-500/20 hover:scale-[1.02]"
          >
            <Plus className="h-3.5 w-3.5" /> <span>{"Add Supplier"}</span>
          </Button>
        </div>
      </div>

      <div className="relative z-30 bg-white/50 dark:bg-black/20 p-3 lg:p-4 rounded-[1.75rem] border border-gray-200/50 dark:border-white/5 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1">
            <SharedSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={"Search partners..."}
            />
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <DateRangePicker
              preset={dateFilter}
              presets={[
                { id: 'all', label: "ALL TIME" },
                { id: 'today', label: "TODAY" },
                { id: 'yesterday', label: "YESTERDAY" },
                { id: 'last7', label: "LAST 7 DAYS" },
                { id: 'thisMonth', label: "THIS MONTH" },
                { id: 'lastMonth', label: "PREVIOUS MONTH" },
                { id: 'custom', label: "CUSTOM RANGE" }
              ]}
              onPresetChange={setDateFilter}
              startDate={startDateInput}
              endDate={endDateInput}
              onStartDateChange={setStartDateInput}
              onEndDateChange={setEndDateInput}
              label={"RANGE"}
              icon={Receipt}
            />
          </div>
        </div>
      </div>

      {/* Layer 3: Vibrant Stats section */}
      <div className="relative z-20 grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4 mt-2">
        <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-700">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Active Partners"}</span>
            <span className="stat-card-value">{activeSuppliers}</span>
            <p className="text-[7px] font-black text-emerald-100/50 uppercase tracking-widest mt-1">{"Network Strength"}</p>
          </div>
          <Truck className="stat-card-icon h-10 w-10 text-white" />
        </div>

        <div className="stat-card bg-gradient-to-br from-rose-500 to-red-700">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Total Payables"}</span>
            <span className="stat-card-value text-xl lg:text-2xl">{formatCurrency(totalRemaining, appSettings.currency)}</span>
            <p className="text-[7px] font-black text-rose-100/50 uppercase tracking-widest mt-1">{totalRemaining > 0 ? "Outstanding Debt" : "Clear Balance"}</p>
          </div>
          <Briefcase className="stat-card-icon h-10 w-10 text-white" />
        </div>
      </div>

      {/* Main Grid View */}
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 mt-2">
              {filteredSuppliers.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-surface rounded-3xl border border-gray-200 dark:border-white/5">
                  <EmptyState
                    icon={<Briefcase className="h-full w-full text-gray-600" />}
                    title={"No partners found"}
                    className="p-20 opacity-20"
                  />
                </div>
              ) : (
                pageItems.map((supplier) => (
            <div key={supplier.id} className="bg-white dark:bg-surface p-4 rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl hover:scale-[1.02] transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none truncate max-w-[150px]">{supplier.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded-full inline-block border border-primary/10">
                        {supplier.businessType || "PARTNER"}
                      </span>
                      {typeof supplier.rating === 'number' && supplier.rating > 0 && (
                        <span className="text-[9px] font-black text-amber-500 tracking-widest bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full inline-block border border-amber-200 dark:border-amber-500/20">
                          {'★'.repeat(supplier.rating)}{'☆'.repeat(5 - supplier.rating)} {supplier.rating}/5
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" onClick={() => handleAddEdit(supplier)} className="!min-h-0 !p-1.5 !rounded-lg !text-primary hover:!bg-emerald-50 dark:hover:!bg-primary/10 hover:scale-110 active:scale-90">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" onClick={() => handleDelete(supplier.id, supplier.name)} className="!min-h-0 !p-1.5 !rounded-lg !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-500/10 hover:scale-110 active:scale-90">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 py-4 border-y border-gray-50 dark:border-white/5 mb-4">
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                      <Phone className="h-3 w-3 text-gray-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                      <Mail className="h-3 w-3 text-gray-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 truncate">{supplier.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                    <MapPin className="h-3 w-3 text-gray-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 truncate">{supplier.address || "Address not set"}</span>
                </div>
                {supplier.paymentTerms && (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                      <CreditCard className="h-3 w-3 text-gray-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 truncate">{supplier.paymentTerms}</span>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                fullWidth
                onClick={() => setSelectedSupplierId(supplier.id)}
                className="mt-auto !py-3 !rounded-2xl !text-[10px] !font-black !tracking-[0.2em] !bg-gray-50 dark:!bg-white/5 !border-gray-200 dark:!border-white/5 !text-gray-900 dark:!text-white hover:!bg-primary hover:!text-white dark:hover:!bg-primary group/btn"
              >
                <Wallet className="h-3.5 w-3.5 transition-transform group-hover/btn:scale-110" />
                <span>{"View Ledger"}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-30 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          ))
        )}
      </div>

       
        <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/5 flex justify-center mt-4 rounded-3xl">
          <Pagination
              page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={filteredSuppliers.length}
            mode="numbered"
          
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
        </div>
       
    </>
  );


      <SupplierModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSupplier}
          supplier={editingSupplier}
        />
        </div>
      )} {/* end !selectedSupplierId list */}
    </>
  );
}
