import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sale, RefundRequest } from '../../types';
import { salesService } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { formatCurrency } from '../../lib/currencies';
import { useSalesStore, useCustomersStore, useCartStore } from '../../stores';

interface TransactionDetailActionsParams {
  transaction: Sale;
  appCustomers: ReturnType<typeof useCustomersStore.getState>['customers'];
  appSales: Sale[];
  onClose: () => void;
  onNavigate: (sale: Sale) => void;
  detailNavigate: ReturnType<typeof useNavigate>;
  setIsRefundModalOpen: (open: boolean) => void;
  profile: { canEditSale: boolean; canDeleteSale: boolean };
  currency: string;
}

export function useTransactionDetailActions({
  transaction,
  appCustomers,
  appSales,
  onClose,
  onNavigate,
  detailNavigate,
  setIsRefundModalOpen,
  profile,
  currency,
}: TransactionDetailActionsParams) {
  const [isProcessingAction, setIsProcessing] = useState(false);

  const handleEditSale = async () => {
    const result = await sonner.confirm('Edit Sale?', 'Load items and notes to cart for editing?', 'Yes');
    if (!result.isConfirmed) return;
    setIsProcessing(true);
    try {
      useCartStore.getState().clearCart();
      transaction.items.forEach(item => useCartStore.getState().addToCart(item));
      useCartStore.getState().setNotes(transaction.notes || '');
      useCartStore.getState().setEditingSaleId(transaction.id);

      if (transaction.customerId) {
        const customer = appCustomers.find(c => c.id === transaction.customerId);
        if (customer) useCartStore.getState().setSelectedCustomer(customer);
      }

      sonner.success('Loaded to POS for editing.');
      onClose();
      detailNavigate('/pos');
    } catch {
      sonner.error('Error editing sale.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeRefund = async (request: RefundRequest) => {
    setIsProcessing(true);
    try {
      await salesService.returnSale(transaction.id, request, profile?.name || 'Cashier');

      const updatedTx: Sale = {
        ...transaction,
        status: request.type === 'full' ? 'refunded' : 'partially_refunded',
        refundedAmount: (transaction.refundedAmount || 0) + request.totalRefundAmount,
        items: transaction.items.map((item: any, idx: number) => {
          if (request.type === 'full') {
            return { ...item, refundedQuantity: item.quantity };
          } else {
            const reqItem = request.items.find((ri: any) => ri.index === idx);
            if (reqItem) {
              return { ...item, refundedQuantity: (item.refundedQuantity || 0) + reqItem.qty };
            }
          }
          return item;
        })
      };

      useSalesStore.getState().updateSale(updatedTx);
      onNavigate(updatedTx);
      sonner.success('Sale successfully refunded.');
      setIsRefundModalOpen(false);
    } catch (error) {
      console.error('[RefundError]', error);
      sonner.error('Error refunding sale.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWhatsAppShare = () => {
    const customer = appCustomers.find(c => c.id === transaction.customerId);
    const phone = customer?.phone || '';
    if (!phone) { sonner.error('No phone number.'); return; }
    let fp = phone.replace(/\D/g, '');
    if (fp.startsWith('0')) fp = '92' + fp.substring(1);
    const msg = `🧾 *Invoice*\nTotal: ${formatCurrency(transaction.total, currency)}`;
    window.open(`https://wa.me/${fp}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDeleteSale = async () => {
    const result = await sonner.confirm(
      'PERMANENT DELETE?',
      'All records (Stock, Reports, Inventory) will be REVERTED. This cannot be undone!',
      'Yes, Delete'
    );
    if (!result.isConfirmed) return;

    setIsProcessing(true);
    try {
      await salesService.delete(transaction.id, profile?.name || 'Admin');
      useSalesStore.getState().deleteSale(transaction.id);
      sonner.success('Sale permanently deleted and records reverted.');
      onClose();
    } catch (err) {
      console.error('[DeleteError]', err);
      sonner.error('Error deleting sale.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSaleTypeTag = () => {
    const type = transaction.saleType || 'retail';
    switch (type) {
      case 'wholesale':
        return { label: 'WHOLESALE', tone: 'info' as const, cls: '!bg-blue-100 dark:!bg-blue-500/10 !text-blue-700 dark:!text-blue-400 !border-blue-200 dark:!border-blue-500/20 !rounded-lg' };
      default:
        return { label: 'RETAIL', tone: 'success' as const, cls: '!bg-primary/10 !text-primary dark:!text-emerald-400 !border-primary/20 !rounded-lg' };
    }
  };

  const sourceTag = getSaleTypeTag();

  return {
    isProcessingAction,
    handleEditSale,
    executeRefund,
    handleWhatsAppShare,
    handleDeleteSale,
    sourceTag,
  };
}
