import { type Sale } from '../../../types';
import { MessageCircle, Printer, X, ShieldAlert, Check, Share2 } from 'lucide-react';
import { Modal } from '../../../shared/ui/Modal';
import { useReceiptActions } from './useReceiptActions';
import { renderNewLayout } from './ReceiptLayouts';
import { renderMonospaceBody } from './ReceiptMonospace';
import { ReceiptScaler } from './ReceiptScaler';
import { buildReceiptCtx } from './buildReceiptCtx';

export interface ReceiptPrintProps {
  sale: Sale;
  onClose: () => void;
}

export function ReceiptPrint({ sale, onClose }: ReceiptPrintProps) {
  const ctx = buildReceiptCtx(sale);
  const isAutoPrint = ctx.settings.receiptPrinter;
  const isNewLayout = ctx.isNewLayout;
  const paperWidthPx = ctx.paperWidthPx;

  const { handlePrint, handleSafeClose, handleWhatsAppRedirect, handleShareReceipt, isSharing } = useReceiptActions(ctx, { onClose, isAutoPrint });

  const renderReceiptBody = () => {
    if (isNewLayout) {
      return (
        <div id="receipt-content" style={{ width: paperWidthPx, maxWidth: paperWidthPx, margin: '0 auto' }}>
          {renderNewLayout(ctx)}
        </div>
      );
    }
    return renderMonospaceBody(ctx);
  };

  if (isAutoPrint) {
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4">
        <div className="bg-white dark:bg-surface rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-white/5 flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300">
          <div className="relative">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20">
              <Printer className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Check className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-widest">Printing Bill</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">Please wait while your receipt is being processed...</p>
          </div>
          <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full animate-progress" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button onClick={() => handlePrint()} className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
              Print Manually
            </button>
            <button onClick={handleSafeClose} className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white transition-colors">
              Tap to close
            </button>
          </div>
        </div>
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
          {renderReceiptBody()}
        </div>
      </div>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={handleSafeClose}
      title="PRINT CHECKOUT"
      subtitle="POS • Monochrome"
      maxWidth={ctx.isA4 ? 'lg' : 'md'}
      headerActions={
        <div>
          {ctx.sale.customerPhone && (
            <button
              onClick={handleWhatsAppRedirect}
              className="btn btn-md btn-primary w-10 h-10"
              title="Send via WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      }
      footer={
        <div className="flex flex-col w-full gap-2 sm:gap-4">
          <div className="flex justify-center">
            <div className="bg-yellow-50 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-400 text-[9px] sm:text-[10px] font-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center gap-1.5 border border-yellow-200 dark:border-yellow-500/20 uppercase tracking-widest">
              <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> In print dialog: disable Headers & Footers
            </div>
          </div>
          <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
            <button
              id="receipt-close-btn"
              onClick={handleSafeClose}
              className="btn btn-md group flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-primary/20 dark:bg-surface dark:text-emerald-400 dark:hover:bg-primary dark:hover:text-white transition-all !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[10px]"
            >
              <span>NEW SALE</span>
              <span className="hidden sm:inline-flex items-center ml-1.5 px-1 py-0.5 text-[8px] tracking-normal font-bold bg-primary/10 group-hover:bg-white/20 rounded-md">ESC</span>
            </button>
            <button
              id="receipt-share-btn"
              onClick={handleShareReceipt}
              disabled={isSharing}
              className="group flex-1 py-2.5 sm:py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-full font-black transition-all shadow-lg shadow-blue-500/20 text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-1.5"
            >
              {isSharing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="flex items-center">
                    SHARE
                    <span className="hidden sm:inline-flex items-center ml-1.5 px-1.5 py-0.5 text-[8px] tracking-normal font-bold bg-white/20 rounded-md">S</span>
                  </span>
                </>
              )}
            </button>
            <button
              id="receipt-print-btn"
              onClick={handlePrint}
              className="btn btn-md btn-primary group flex-[1.5] !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[10px]"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="flex items-center">
                PRINT BILL
                <span className="hidden sm:inline-flex items-center ml-1.5 px-1 py-0.5 text-[8px] tracking-normal font-bold bg-white/20 rounded-md">ENTER</span>
              </span>
            </button>
          </div>
        </div>
      }

    >
      <ReceiptScaler paperWidthPx={paperWidthPx}>
        {renderReceiptBody()}
      </ReceiptScaler>
    </Modal>
  );
}

export default ReceiptPrint;
