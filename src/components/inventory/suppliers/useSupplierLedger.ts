import { useSettingsStore, useUsersStore, useExpensesStore } from '../../../stores';
import { useState, useEffect, useMemo } from 'react';
import { Supplier } from '../../../types';
import { suppliersService, expensesService, generateId } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import { usePagination } from '../../../shared/ui';

interface SupplierLedgerHookArgs {
  supplier: Supplier;
  startDate?: Date;
  endDate?: Date;
  dateFilter?: string;
}

export function useSupplierLedger({ supplier, startDate, endDate, dateFilter }: SupplierLedgerHookArgs) {
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSettings = useSettingsStore(s => s.settings);

  const [ledger, setLedger] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 50;

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');

  const [billAmount, setBillAmount] = useState('');
  const [billNote, setBillNote] = useState('');
  const [isPaymentManualOverride, setIsPaymentManualOverride] = useState(false);
  const [isBillManualOverride, setIsBillManualOverride] = useState(false);

  const loadLedger = async () => {
    try {
      setLoading(true);
      const data = await suppliersService.getLedger(supplier.id, 999999, 0, false);
      setLedger(data);
      const bal = await suppliersService.getBalance(supplier.id);
      setBalance(bal);
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [supplier.id]);

  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    ledger.forEach(tt => {
      const amt = Number(tt.debit) || Number(tt.credit) || 0;
      if (tt.type === 'payment' || tt.type === 'return') {
        totalPaid += amt;
      } else {
        totalBilled += amt;
      }
    });
    return { totalBilled, totalPaid, remaining: totalBilled - totalPaid };
  }, [ledger]);

  const handleMakePayment = () => {
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      sonner.error('Please enter a valid amount');
      return;
    }

    try {
      setFormLoading(true);
      sonner.loading('Recording payment...');

      const newExpense = {
        id: generateId(),
        date: new Date(),
        description: `Supplier Payout: ${supplier.name}`,
        amount: amount,
        category: 'Supplies',
        paymentMethod: paymentMethod,
        notes: `From Supplier Ledger. ${paymentNote ? 'Ref: ' + paymentNote : ''}`,
        addedBy: appCurrentUser?.name || appCurrentUser?.username || 'Operator',
        createdAt: new Date()
      };
      await expensesService.create(newExpense as any);
      useExpensesStore.getState().addExpense(newExpense as any);

      await suppliersService.recordPayment({
        supplier_id: supplier.id,
        amount: amount,
        payment_type: paymentMethod,
        note: paymentNote,
        isManualOverride: isPaymentManualOverride,
        overrideBy: isPaymentManualOverride ? (appCurrentUser?.id || appCurrentUser?.username) : undefined,
        expenseId: newExpense.id,
      });
      sonner.success('Payment recorded!');
      setShowPaymentModal(false);
      setIsPaymentManualOverride(false);
      loadLedger();
    } catch (err) {
      console.error(err);
      sonner.error('Failed to submit payment.');
    } finally {
      setFormLoading(false);
      sonner.close();
    }
  };

  const handleRecordBill = () => {
    setBillAmount('');
    setBillNote('');
    setShowBillModal(true);
  };

  const submitBill = async () => {
    const amount = Number(billAmount);
    if (!amount || amount <= 0) {
      sonner.error('Please enter a valid amount');
      return;
    }

    try {
      setFormLoading(true);
      sonner.loading('Recording bill...');

      await suppliersService.recordBill({
        supplierId: supplier.id,
        amount: amount,
        note: billNote || 'Manual Bill Entry',
        sourceType: 'manual_bill',
        isManualOverride: isBillManualOverride,
        overrideBy: isBillManualOverride ? (appCurrentUser?.id || appCurrentUser?.username) : undefined,
      });

      sonner.success('Bill recorded!');
      setShowBillModal(false);
      setIsBillManualOverride(false);
      loadLedger();
    } catch (err) {
      console.error(err);
      sonner.error('Failed to record bill.');
    } finally {
      setFormLoading(false);
      sonner.close();
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const { isConfirmed } = await sonner.confirm(
      'Delete Transaction?',
      'This will permanently remove this entry from the ledger and recalculate the balance. This action cannot be undone.'
    );

    if (isConfirmed) {
      try {
        sonner.loading('Deleting transaction...');
        await suppliersService.deleteTransaction(id);
        sonner.dismissAll();
        sonner.success('Transaction deleted!');
        loadLedger();
      } catch (err) {
        console.error(err);
        sonner.error('Failed to delete transaction.');
      } finally {
        sonner.close();
      }
    }
  };

  const filteredLedger = useMemo(() => {
    let result = ledger;
    if (dateFilter && dateFilter !== 'all' && startDate && endDate) {
      result = result.filter(l => {
        const d = new Date(l.date || 0);
        return d >= startDate && d <= endDate;
      });
    }
    if (!searchTerm) return result;
    return result.filter(l =>
      (l.detail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ledger, searchTerm, dateFilter, startDate, endDate]);

  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredLedger, ITEMS_PER_PAGE);

  return {
    appSettings,
    ledger,
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
  };
}
