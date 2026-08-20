import React from 'react';
import { ShoppingCart, Keyboard, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { CheckoutPage } from './CheckoutPage';
import { SalesTabManager } from './SalesTabManager';
import { GridDensityController } from './GridDensityController';
import { DraftsModal } from './DraftsModal';
import { ProductOptionsModal } from './ProductOptionsModal';
import { ShortcutsModal } from './ShortcutsModal';
import { formatCurrency } from '../../lib/currencies';
import { usePOSTerminalData } from './usePOSTerminalData';

export function POSTerminal() {
  const {
    posContainerRef, isTouchMode, scrollTabs, canScrollTabsLeft, canScrollTabsRight,
    tabsRef, checkTabsScroll, appSalesTabs, isReturnMode, setIsReturnMode,
    setIsShortcutsModalOpen, addToCart, setIsDraftsModalOpen, showCheckout,
    handleCheckout, saveDraft, isMobileCartOpen, setIsMobileCartOpen, appCart,
    cartTotal, appSettings, handleCheckoutComplete, isDraftsModalOpen, loadDraft,
    optionsProduct, setOptionsProduct, setPendingWeight, pendingWeight,
    isShortcutsModalOpen, setShowCheckout
  } = usePOSTerminalData();

  return (
    <div
      ref={posContainerRef}
      tabIndex={-1}
      className="flex flex-col md:flex-row h-full w-full bg-gray-50 dark:bg-app relative overflow-hidden transition-colors select-none outline-none"
    >
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-app transition-colors relative">
          <div className="bg-white dark:bg-surface px-2 py-0.5 sm:px-4 sm:py-2 border-b border-gray-200 dark:border-white/5 flex items-center justify-between shadow-sm z-10 transition-colors flex-shrink-0">
            <div className="flex items-center min-w-0 flex-1 md:shrink-0 mr-2 gap-1 lg:gap-2 justify-start">
              <div className="relative group flex items-center min-w-0 flex-shrink">
                <button
                  onClick={() => scrollTabs('left')}
                  style={{ minHeight: 'unset' }}
                  className={`absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 min-h-0 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shadow-md transition-opacity duration-200 active:scale-90 ${canScrollTabsLeft ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none hidden'}`}
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>

                <div
                  ref={tabsRef}
                  onScroll={checkTabsScroll}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth snap-x min-w-0 flex-shrink"
                >
                  <SalesTabManager showAddButton={false} />
                </div>

                <button
                  onClick={() => scrollTabs('right')}
                  style={{ minHeight: 'unset' }}
                  className={`absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 min-h-0 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shadow-md transition-opacity duration-200 active:scale-90 ${canScrollTabsRight ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none hidden'}`}
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {appSalesTabs.length < 3 && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('create-new-tab'))}
                  style={{ minHeight: 'unset' }}
                  className="w-5 h-5 min-h-0 lg:w-8 lg:h-8 flex items-center justify-center bg-primary/10 text-primary dark:text-emerald-400 rounded-md lg:rounded-lg transition-all active:scale-90 border border-primary/20 hover:bg-primary hover:text-white shrink-0 z-10"
                  title="Add New Tab"
                >
                  <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
                </button>
              )}

              <div className="h-4 w-[1px] bg-gray-100 dark:bg-white/10 shrink-0 hidden lg:block" />
              <GridDensityController />
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <button
                onClick={() => setIsShortcutsModalOpen(true)}
                style={{ minHeight: 'unset' }}
                className="p-1.5 min-h-0 bg-gray-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-primary/10 text-gray-500 dark:text-gray-400 hover:text-primary rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                title={"Shortcuts Guide"}
              >
                <Keyboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <div className="h-4 w-[1px] bg-gray-100 dark:bg-white/10 shrink-0 mx-0.5" />
              <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest leading-none ${isReturnMode ? 'text-red-600 dark:text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                {isReturnMode ? "Return" : "Sale"}
              </span>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isReturnMode}
                    onChange={(e) => {
                      setIsReturnMode(e.target.checked);
                      window.dispatchEvent(new CustomEvent('refocus-search'));
                    }}
                  />
                  <div className={`block w-7 h-4 lg:w-10 lg:h-6 rounded-full transition-colors ${isReturnMode ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-gray-300 dark:bg-white/10'}`}></div>
                  <div className={`dot absolute left-[2px] top-[2px] lg:left-1 lg:top-1 bg-white w-3 h-3 lg:w-4 lg:h-4 rounded-full transition-transform ${isReturnMode ? 'transform translate-x-[12px] lg:translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ProductGrid
              onAddToCart={addToCart}
              onOpenDrafts={() => setIsDraftsModalOpen(true)}
              onAddTab={() => window.dispatchEvent(new CustomEvent('create-new-tab'))}
              isReturnMode={isReturnMode}
            />
          </div>
        </div>

        <div className={`hidden md:flex flex-col h-full p-2 lg:py-3 lg:pl-2 lg:pr-5 bg-gray-50 dark:bg-app flex-shrink-0 z-30 transition-all duration-300 overflow-hidden ${isTouchMode ? 'w-[410px]' : 'w-[340px]'}`}>
          <Cart onCheckout={handleCheckout} onSaveDraft={saveDraft} />
        </div>

        <div className="md:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 bg-zinc-900/95 dark:bg-black/90 border border-white/10 p-2 pl-3.5 pr-2 flex items-center justify-between z-40 rounded-full shadow-2xl transition-all animate-slide-up backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="bg-primary/25 p-2 rounded-full text-primary shrink-0">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-zinc-900 shadow-lg">
                {appCart.reduce((sum: number, item: any) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest leading-none mb-0.5">{"Total"}</span>
              <span className="font-black text-white text-sm tracking-tight leading-none">{formatCurrency(cartTotal, appSettings.currency)}</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="bg-primary hover:bg-primary text-white px-5 h-9 rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            {"Review Cart"}
          </button>
        </div>

        {isMobileCartOpen && (
          <div 
            data-modal="true"
            onClick={() => setIsMobileCartOpen(false)}
            className="md:hidden fixed inset-0 z-[1000] bg-black/70 transition-opacity flex items-center justify-center p-3 sm:p-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-surface w-full max-w-[480px] max-h-[calc(100dvh-2.5rem-env(safe-area-inset-top))] sm:max-h-[calc(90dvh-env(safe-area-inset-top))] rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
            >
              <Cart
                onCheckout={() => {
                  setIsMobileCartOpen(false);
                  handleCheckout();
                }}
                onSaveDraft={() => {
                  setIsMobileCartOpen(false);
                  saveDraft();
                }}
                isMobileDrawer={true}
                onClose={() => setIsMobileCartOpen(false)}
              />
            </div>
          </div>
        )}

        {showCheckout && (
          <CheckoutPage
            onClose={() => setShowCheckout(false)}
            onComplete={handleCheckoutComplete}
          />
        )}

        <DraftsModal
          isOpen={isDraftsModalOpen}
          onClose={() => setIsDraftsModalOpen(false)}
          onLoadDraft={loadDraft}
        />

        {optionsProduct && (
          <ProductOptionsModal
            product={optionsProduct}
            isOpen={!!optionsProduct}
            onClose={() => {
              setOptionsProduct(null);
              setPendingWeight(undefined);
            }}
            onConfirm={(options: any) => {
              addToCart(optionsProduct, pendingWeight, options);
              setOptionsProduct(null);
              setPendingWeight(undefined);
            }}
          />
        )}

        <ShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />
      </div>
    </div>
  );
}