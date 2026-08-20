import React from 'react';
import { ChevronLeft, Wallet, TrendingUp, TrendingDown, Clock, Plus, Check, FileText, Phone } from 'lucide-react';
import { formatCurrency } from '../../../lib/currencies';
import { SharedSearchBar } from '../../../shared/modules/search-and-list';
import { Button } from '../../../shared/ui';
import { TransactionList } from './TransactionList';
import { PaymentModal } from './PaymentModal';
import { BillModal } from './BillModal';
import { useSupplierLedger } from './useSupplierLedger';

interface SupplierLedgerProps {
  supplier: any;
  onBack: () => void;
  startDate?: Date;
  endDate?: Date;
  dateFilter?: string;
}

export function SupplierLedger({ supplier, onBack, startDate, endDate, dateFilter }: SupplierLedgerProps) {
  const {
    appSettings,
    t,
    balance,
    loading,
    searchTerm,
    setSearchTerm,
    showPaymentModal,
    setShowPaymentModal,
    showBillModal,
    setShowBillModal,
    formLoading,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentNote,
    setPaymentNote,
    billAmount,
    setBillAmount,
    billNote,
    setBillNote,
    isPaymentManualOverride,
    setIsPaymentManualOverride,
    isBillManualOverride,
    setIsBillManualOverride,
    stats,
    handleMakePayment,
    submitPayment,
    handleRecordBill,
    submitBill,
    handleDeleteTransaction,
    filteredLedger,
    page,
    totalPages,
    pageItems,
    goToPage,
    pageSize,
    setPageSize,
  } = useSupplierLedger({ supplier, startDate, endDate, dateFilter });

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button
          variant="secondary"
          onClick={onBack}
          className="!bg-white dark:!bg-zinc-900 !px-4 !py-2.5 !rounded-xl !shadow-sm !border-gray-200 dark:!border-white/5 !font-black !text-[10px] !text-gray-600 hover:!text-gray-900 dark:hover:!text-white w-full sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" /> {"Back to Suppliers"}
        </Button>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="danger" onClick={handleRecordBill} className="flex-1 sm:flex-none !px-5 !py-2.5 !rounded-xl !font-black !text-[11px] !bg-rose-500 hover:!bg-rose-600 !shadow-lg !shadow-rose-500/20">
            <FileText className="h-4 w-4" /> {"Bill"}
          </Button>
          <Button variant="primary" onClick={handleMakePayment} className="flex-1">
            <Plus className="h-4 w-4" /> {"Payment"}
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-app rounded-[2rem] p-6 lg:p-8 shadow-2xl border border-gray-200 dark:border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none group-hover:bg-primary/15 transition-colors duration-700" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-gray-200 dark:border-white/10 pb-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                {supplier.name}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
              <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-primary/50" /> {supplier.phone || "No Phone"}</span>
              <span className="hidden sm:block text-white/10">|</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-indigo-500/50" /> {supplier.paymentTerms || "Standard Terms"}</span>
            </div>
          </div>
          <div className="w-full lg:w-auto text-left lg:text-right bg-black/5 dark:bg-white/5 p-4 lg:p-0 rounded-2xl lg:bg-transparent">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-1">{"Outstanding Balance"}</p>
            <p className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter drop-shadow-sm ${balance > 0 ? 'text-rose-500' : 'text-primary'}`}>
              {formatCurrency(balance, appSettings.currency)}
            </p>
            {balance <= 0 && (
              <p className="text-[10px] font-black text-primary mt-2 uppercase tracking-[0.2em] flex items-center justify-start lg:justify-end gap-2">
                <Check className="h-4 w-4 bg-primary/20 p-0.5 rounded-full" /> {"All Settled"}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-6">
          <div className="stat-card bg-gradient-to-br from-rose-500 to-rose-700 p-4 sm:p-5 rounded-[1.5rem] shadow-lg shadow-rose-500/20 col-span-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{"Total Billed"}</span>
              <TrendingUp className="h-4 w-4 text-white/40" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{formatCurrency(stats.totalBilled, appSettings.currency)}</p>
          </div>

          <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-700 p-4 sm:p-5 rounded-[1.5rem] shadow-lg shadow-emerald-500/20 col-span-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{"Total Paid"}</span>
              <TrendingDown className="h-4 w-4 text-white/40" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{formatCurrency(stats.totalPaid, appSettings.currency)}</p>
          </div>

          <div className="stat-card bg-gradient-to-br from-indigo-500 to-blue-700 p-4 sm:p-5 rounded-[1.5rem] shadow-lg shadow-indigo-500/20 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{"Remaining Debt"}</span>
              <Clock className="h-4 w-4 text-white/40" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatCurrency(Math.abs(stats?.remaining || 0), appSettings.currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">{"Full Ledger (Auto + Manual Bills & Payments)"}</p>
          <div className="w-full max-w-xs">
            <SharedSearchBar value={searchTerm} onChange={setSearchTerm} placeholder={"Filter transactions..."} />
          </div>
        </div>
        <TransactionList
          loading={loading}
          filteredLedger={filteredLedger}
          pageItems={pageItems}
          page={page}
          totalPages={totalPages}
          goToPage={goToPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          handleDeleteTransaction={handleDeleteTransaction}
          appSettings={appSettings}
          t={t}
        />
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        supplierName={supplier.name}
        balance={balance}
        appSettings={appSettings}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        isPaymentManualOverride={isPaymentManualOverride}
        setIsPaymentManualOverride={setIsPaymentManualOverride}
        submitPayment={submitPayment}
        formLoading={formLoading}
        t={t}
      />

      <BillModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        billAmount={billAmount}
        setBillAmount={setBillAmount}
        billNote={billNote}
        setBillNote={setBillNote}
        isBillManualOverride={isBillManualOverride}
        setIsBillManualOverride={setIsBillManualOverride}
        submitBill={submitBill}
        formLoading={formLoading}
        t={t}
      />
    </div>
  );
}
