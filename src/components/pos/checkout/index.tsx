import React from 'react';
import { Check, RefreshCw, Keyboard, Tag } from 'lucide-react';
import { Sale } from '../../../types';
import { KOTPrint } from '../KOTPrint';
import { ReceiptPrint } from '../ReceiptPrint';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { ShortcutsModal } from '../ShortcutsModal';
import { PaymentForm } from './PaymentForm';
import { OrderSummary } from './OrderSummary';
import { useCheckoutData } from './useCheckoutData';
import { formatCurrency } from '../../../lib/currencies';

interface CheckoutPageProps {
  onClose: () => void;
  onComplete: (sale: Sale) => void;
}

export function CheckoutPage({ onClose, onComplete }: CheckoutPageProps) {
  const {
    appSettings, paymentMethod, handleSelectMethod, amountPaid, setAmountPaid,
    splitMethodA, setSplitMethodA, splitMethodB, setSplitMethodB,
    splitAmountA, setSplitAmountA, splitAmountB, setSplitAmountB,
    finalTotal, change, quickAmounts, extraCharges, setExtraCharges,
    saleType, setSaleType, saleTypes, payMethods, salesmanId, setSalesmanId,
    appUsers, appSalesmen, saleNotes, setSaleNotes, appActiveSalesTab,
    checkoutCartItems, appBundles, showDiscount, subtotal, totalDiscount,
    taxAmount, totalQty, showReceipt, completedSale, setShowReceipt,
    setCompletedSale, isShortcutsModalOpen, setIsShortcutsModalOpen,
    handlePayment, canProcessPayment, isProcessing,
  } = useCheckoutData(onClose, onComplete);

  if (showReceipt && completedSale) {
    return (
      <>
        <ReceiptPrint
          sale={completedSale}
          onClose={() => { setShowReceipt(false); setCompletedSale(null); onClose(); }}
        />
        {appSettings.enableKotPrinter && <KOTPrint sale={completedSale} />}
      </>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
      <button
        onClick={() => setIsShortcutsModalOpen(true)}
        className="p-2 sm:p-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-400 rounded-2xl hover:bg-emerald-50 dark:hover:bg-primary/10 hover:text-primary transition-all active:scale-90 flex items-center gap-1.5"
        title={"Shortcuts Guide"}
      >
        <Keyboard className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest leading-none">{"Shortcuts"}</span>
      </button>

      <Button
        onClick={handlePayment}
        disabled={!canProcessPayment() || isProcessing}
        loading={isProcessing}
        icon={<Check className="h-3.5 w-3.5 shrink-0" />}
        className="md:hidden !px-3 !py-2 !text-[8px] max-w-[120px]"
      >
        <span className="truncate">{"SAVE"}</span>
      </Button>

      <div className="hidden sm:flex flex-col items-end">
        <p className="text-[8px] sm:text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest leading-none">{"Net Total"}</p>
        <p className="text-base sm:text-xl font-black text-primary dark:text-emerald-400 tabular-nums leading-tight mt-0.5">{formatCurrency(finalTotal, appSettings.currency)}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col w-full gap-2">
      <div
        onClick={() => setIsShortcutsModalOpen(true)}
        className="hidden sm:flex items-center justify-center gap-3 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
        title={"Click to open shortcuts guide"}
      >
        {[
          { key: '1', label: 'Cash' },
          { key: '2', label: 'Card' },
          { key: '3', label: 'Online' },
          { key: '5', label: 'Split' },
          { key: 'E', label: 'Exact Amt' },
          { key: 'Enter', label: 'Pay' },
          { key: 'Esc', label: 'Cancel' },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1">
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-[8px] font-black text-gray-600 dark:text-gray-400 shadow-sm leading-none">
              {key}
            </kbd>
            <span className="text-[8px] text-gray-400">{label}</span>
          </span>
        ))}
      </div>
      <div className="flex w-full items-center gap-2 sm:gap-3">
        <button onClick={onClose} disabled={isProcessing}
          className="px-5 py-2.5 h-[40px] rounded-full border border-rose-500/20 text-[#ff4b6e] hover:bg-rose-500/10 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center shrink-0">
          {"Cancel"}
        </button>
        <Button 
          onClick={handlePayment} 
          disabled={!canProcessPayment() || isProcessing}
          loading={isProcessing}
          icon={<Check className="h-4 w-4 sm:h-5 sm:w-5" />}
          className="flex-1 !rounded-full !h-[40px] !py-2.5 !text-[9px] font-black uppercase tracking-widest active:scale-[0.98] shadow-lg shadow-emerald-500/20 disabled:grayscale transition-all"
        >
          <span>{"Process Payment"}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={"Settlement"}
      subtitle={"Finalization"}
      maxWidth="lg"
      headerActions={headerActions}
      footer={footer}
    >
      <div className="flex flex-col md:grid md:grid-cols-2 md:divide-x divide-gray-100 dark:divide-white/5 min-h-full">
        <PaymentForm
          appSettings={appSettings}
          paymentMethod={paymentMethod}
          handleSelectMethod={handleSelectMethod}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          splitMethodA={splitMethodA}
          setSplitMethodA={setSplitMethodA}
          splitMethodB={splitMethodB}
          setSplitMethodB={setSplitMethodB}
          splitAmountA={splitAmountA}
          setSplitAmountA={setSplitAmountA}
          splitAmountB={splitAmountB}
          setSplitAmountB={setSplitAmountB}
          finalTotal={finalTotal}
          change={change}
          totalQty={totalQty}
          quickAmounts={quickAmounts}
          extraCharges={extraCharges}
          setExtraCharges={setExtraCharges}
          saleType={saleType}
          setSaleType={setSaleType}
          saleTypes={saleTypes}
          payMethods={payMethods}
          salesmanId={salesmanId}
          setSalesmanId={setSalesmanId}
          appUsers={appUsers}
          appSalesmen={appSalesmen}
          saleNotes={saleNotes}
          setSaleNotes={setSaleNotes}
          appActiveSalesTab={appActiveSalesTab}
        />

        <OrderSummary
          checkoutCartItems={checkoutCartItems}
          appBundles={appBundles}
          showDiscount={showDiscount}
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          taxAmount={taxAmount}
          finalTotal={finalTotal}
          totalQty={totalQty}
          currency={appSettings.currency}
          saleTypes={saleTypes}
        />
      </div>

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </Modal>
  );
}
