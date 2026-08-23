import { StickyFormFooter } from '../../../shared/ui/StickyFormFooter';
import { BatchStockInSystem } from '../BatchStockInSystem';
import { TransactionDetailModal } from '../../transactions/TransactionDetailModal';
import { sonner } from '../../../lib/sonner';
import { useProductDetail, type ProductDetailHubProps } from './useProductDetail';
import { ProductOverview } from './ProductOverview';
import { ProductHistory } from './ProductHistory';
import { ProductMedia } from './ProductMedia';
import { ProductDetailHeader } from './ProductDetailHeader';
import { ProductDetailModals } from './ProductDetailModals';

export function ProductDetailHub(props: ProductDetailHubProps) {
  const d = useProductDetail(props);
  const {
    product, showStockIn, setShowStockIn, showBatchStockIn, setShowBatchStockIn,
    selectedSale, setSelectedSale, productSales, setClickedRowId,
    handleSave, isUpdating, isEditMode, setIsEditMode,
  } = d;

  return (
    <>
      <div className="space-y-0 animate-in slide-in-from-right-4 duration-500">
        <ProductDetailHeader d={d} />

        <div className={`p-4 sm:p-8 space-y-6 lg:space-y-10 max-w-7xl mx-auto transition-all ${isEditMode ? 'pb-[200px] sm:pb-[180px] lg:pb-32' : 'pb-10'}`}>
          <ProductOverview d={d} />

          {showStockIn && (
            <BatchStockInSystem
              initialProduct={product}
              onClose={() => setShowStockIn(false)}
            />
          )}

          <ProductDetailModals d={d} />

          <ProductHistory d={d} />
        </div>
      </div>

      <ProductMedia d={d} />

      <StickyFormFooter
        show={isEditMode}
        isSaving={isUpdating}
        onDiscard={() => setIsEditMode(false)}
        onSave={handleSave}
        saveLabel={"Confirm Changes"}
        unsaved={true}
      />

      {showBatchStockIn && (
        <BatchStockInSystem
          targetProduct={product}
          onClose={() => setShowBatchStockIn(false)}
          onComplete={() => {
            setShowBatchStockIn(false);
          }}
        />
      )}

      {selectedSale && (
        <TransactionDetailModal
          transaction={selectedSale}
          allTransactions={productSales}
          onNavigate={setSelectedSale}
          onReprint={(_sale) => {
            sonner.info('Print requested', 'Navigate to Transactions to print this sale');
          }}
          onClose={() => {
            setSelectedSale(null);
            setTimeout(() => setClickedRowId(null), 1000);
          }}
          onBack={() => {
            setSelectedSale(null);
            setTimeout(() => setClickedRowId(null), 1000);
          }}
        />
      )}
    </>
  );
}

export default ProductDetailHub;
