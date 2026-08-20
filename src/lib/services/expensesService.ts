import { supabase, adminUserAction } from '../supabase';
import {
  Product,
  Customer,
  Sale,
  Discount,
  User,
  AppSettings,
  SalesTab,
  Expense,
  Category,
  Supplier,
  PurchaseRecord,
  ProductBatch,
  SupplierTransaction,
  StockHistory,
  Payment,
  PurchaseOrder,
  Bundle,
  BundleItem,
  CartItem,
  RefundRequest,
  Topping,
  ExtraTopping,
  VariantStockHistory,
  ProductAddon,
} from '../../types';
import { localDb, queueOp, generateId, SETTINGS_ID } from '../localDb';
import { generateBarcodeValue } from '../../utils/barcode';
import { signAction, withActor } from '../actionToken';
import { mapExpense, toRemoteExpense } from './mappers';
import { fetchAllPages, normalizePaymentMethod } from './utils';
import { adjustPaymentBalances } from './paymentsService';

export const expensesService = {
  async getAll(): Promise<Expense[]> {
    return await localDb.expenses.toArray();
  },
  async create(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const id = generateId();
    const newExp = { ...expense, id, createdAt: new Date() } as Expense;
    await localDb.expenses.add(newExp);
    await queueOp('expenses', 'create', id, toRemoteExpense(newExp));
    // Wallet ledger: expense is money OUT (MASTER §6 — every movement leaves
    // a trace in payment_movements, not just payment_modes.balance).
    await adjustPaymentBalances([{
      id,
      modeId: normalizePaymentMethod(newExp.paymentMethod || 'cash'),
      delta: -Number(newExp.amount || 0),
      referenceId: id,
      note: `Expense ${newExp.description || 'Expense'}`,
    }], { batchId: `exp_${id}` });
    return newExp;
  },

  async update(id: string, updates: Partial<Expense>): Promise<Expense> {
    const existing = await localDb.expenses.get(id);
    if (!existing) throw new Error('Expense not found');
    const updated = { ...existing, ...updates, updatedAt: new Date() } as Expense;
    await localDb.expenses.put(updated);
    await queueOp('expenses', 'update', id, toRemoteExpense(updated));
    // Reverse the old amount from the wallet, then apply the new amount.
    await adjustPaymentBalances([
      {
        id: generateId(),
        modeId: normalizePaymentMethod(existing.paymentMethod || 'cash'),
        delta: Number(existing.amount || 0),
        referenceId: id,
        note: `Expense reverse (update) ${existing.description || ''}`,
      },
      {
        id: generateId(),
        modeId: normalizePaymentMethod(updated.paymentMethod || 'cash'),
        delta: -Number(updated.amount || 0),
        referenceId: id,
        note: `Expense ${updated.description || 'Expense'}`,
      },
    ], { batchId: `exp_upd_${id}` });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await localDb.expenses.get(id);
    // Reverse the linked supplier payable (if this was a Supplies expense) so the
    // supplier balance is NOT left inflated after the expense is deleted.
    const linkedBill = (await localDb.supplierTransactions.toArray()).find(t => t.referenceId === id);
    if (linkedBill) {
      await localDb.supplierTransactions.delete(linkedBill.id);
      await queueOp('supplier_transactions', 'delete', linkedBill.id, {});
      // Recalculate supplier running balance after removing the linked bill
      if (linkedBill.supplierId) {
        const allTxns = await localDb.supplierTransactions
          .where('supplierId').equals(linkedBill.supplierId).toArray();
        const credits = allTxns.filter(t => t.type !== 'payment' && t.type !== 'return')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const debits = allTxns.filter(t => t.type === 'payment' || t.type === 'return')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const newBalance = credits - debits;
        await localDb.suppliers.update(linkedBill.supplierId, { balance: newBalance, updatedAt: new Date() });
      }
    }
    await localDb.expenses.delete(id);
    await queueOp('expenses', 'delete', id, {});
    if (existing) {
      // Reverse the expense from the wallet (money back IN).
      await adjustPaymentBalances([{
        id: generateId(),
        modeId: normalizePaymentMethod(existing.paymentMethod || 'cash'),
        delta: Number(existing.amount || 0),
        referenceId: id,
        note: `Expense reverse (delete) ${existing.description || ''}`,
      }], { batchId: `exp_del_${id}` });
    }
  },

  async fetchRemote(lastSyncTime?: Date): Promise<Expense[]> {
    const queryFn = () => {
      let q = supabase.from('expenses').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapExpense);
  },

  async getReportExpensesLocal(startDate: Date, endDate: Date): Promise<Expense[]> {
    return await localDb.expenses
      .filter(e =>
        new Date(e.date) >= startDate &&
        new Date(e.date) <= endDate
      )
      .toArray();
  },

  async getReportExpenses(startDate: Date, endDate: Date): Promise<Expense[]> {
    try {
      // NEVER truncate: paginate to completion (fetchAllPages)
      const all = await fetchAllPages(() => supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false }));

      if (!all || all.length === 0) return [];
      return (all as any[]).map(mapExpense);
    } catch (e) {
      console.warn('getReportExpenses: fallback to localDb'); // fallback to localDb
      return await localDb.expenses
        .filter(e =>
          new Date(e.date || e.createdAt) >= startDate &&
          new Date(e.date || e.createdAt) <= endDate
        )
        .reverse()
        .sortBy('date');
    }
  }
};

/**
 * Discounts Service
 */
