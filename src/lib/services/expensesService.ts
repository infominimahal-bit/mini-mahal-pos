import { supabase } from '../supabase';
import {
  Expense,
} from '../../types';
import { localDb, generateId } from '../localDb';
import { cloudWrite } from '../cloudWrite';
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

    const pMove = {
      id: generateId(),
      mode_id: normalizePaymentMethod(newExp.paymentMethod || 'cash'),
      delta: -Number(newExp.amount || 0),
      reference_id: id,
      note: `Expense ${newExp.description || 'Expense'}`,
    };

    // 1. Cloud FIRST — atomic commit_expense RPC writes the expense row AND the wallet
    // ledger move together. Throws on failure so the local cache never diverges.
    await cloudWrite('expenses', 'create', id, { ...toRemoteExpense(newExp), p_payment_moves: [pMove] } as any);

    // 2. Local cache: expense row + wallet balance mirror (cloud already authoritative).
    await localDb.expenses.add(newExp);
    const nowTime = new Date();
    const mode = await localDb.paymentModes.get(pMove.mode_id);
    if (mode) {
       await localDb.paymentModes.update(pMove.mode_id, { balance: Number(mode.balance || 0) + pMove.delta, updatedAt: nowTime });
    }
    await localDb.payment_movements.add({
       id: pMove.id,
       modeId: pMove.mode_id,
       delta: pMove.delta,
       referenceId: pMove.reference_id,
       note: pMove.note,
       createdAt: nowTime
    }).catch(() => {});

    return newExp;
  },

  async update(id: string, updates: Partial<Expense>): Promise<Expense> {
    const existing = await localDb.expenses.get(id);
    if (!existing) throw new Error('Expense not found');
    const updated = { ...existing, ...updates, updatedAt: new Date() } as Expense;

    // Cloud FIRST, then local cache.
    await cloudWrite('expenses', 'update', id, { ...toRemoteExpense(updated), id });
    await localDb.expenses.put(updated);
    // Reverse the old amount from the wallet, then apply the new amount (cloud-first RPC inside).
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

    // 1. Cloud FIRST — delete expense and any linked supplier bill.
    await cloudWrite('expenses', 'delete', id, {});
    if (linkedBill) await cloudWrite('supplier_transactions', 'delete', linkedBill.id, {});

    // 2. Local mirror: remove linked bill, then recompute supplier running balance and
    // persist it to CLOUD (source of truth) + local — the old code updated local only,
    // leaving the cloud supplier balance permanently stale after a bill delete.
    if (linkedBill) {
      await localDb.supplierTransactions.delete(linkedBill.id);
      if (linkedBill.supplierId) {
        const allTxns = await localDb.supplierTransactions
          .where('supplierId').equals(linkedBill.supplierId).toArray();
        const credits = allTxns.filter(t => t.type !== 'payment' && t.type !== 'return')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const debits = allTxns.filter(t => t.type === 'payment' || t.type === 'return')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const newBalance = credits - debits;
        await cloudWrite('suppliers', 'update', linkedBill.supplierId, { id: linkedBill.supplierId, balance: newBalance, updated_at: new Date().toISOString() });
        await localDb.suppliers.update(linkedBill.supplierId, { balance: newBalance, updatedAt: new Date() });
      }
    }
    await localDb.expenses.delete(id);
    if (existing) {
      // Reverse the expense from the wallet (money back IN) — cloud-first RPC inside.
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
    } catch (_e) {
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
