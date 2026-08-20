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
import { toRemoteSupplier, toRemoteSupplierTransaction, mapSupplier } from './mappers';
import { fetchAllPages, normalizePaymentMethod } from './utils';
import { adjustPaymentBalances } from './paymentsService';

export const suppliersService = {
  async getAll(): Promise<Supplier[]> {
    return await localDb.suppliers.toArray();
  },

  async getById(id: string): Promise<Supplier | null> {
    return await localDb.suppliers.get(id) || null;
  },

  async create(data: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    const id = generateId();
    const sup = { ...data, id, createdAt: new Date() } as Supplier;
    await localDb.suppliers.add(sup);
    await queueOp('suppliers', 'create', id, toRemoteSupplier(sup));

    // Create opening balance transaction if needed
    if (data.openingBalance && data.openingBalance > 0) {
      await this.recordBill({
        supplierId: id,
        amount: data.openingBalance,
        note: 'Opening Balance'
      });
    }

    return sup;
  },

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Supplier not found');
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    await localDb.suppliers.put(updated);
    await queueOp('suppliers', 'update', id, toRemoteSupplier({ ...updates, updatedAt: updated.updatedAt }));
    return updated;
  },

  async delete(id: string): Promise<void> {
    await localDb.suppliers.delete(id);
    queueOp('suppliers', 'delete', id, {});
    // Cleanup transactions?
    await localDb.supplierTransactions.where('supplierId').equals(id).delete();
  },

  async getBalance(supplierId: string): Promise<number> {
    const txs = await localDb.supplierTransactions.where('supplierId').equals(supplierId).toArray();
    return txs.reduce((sum, tx) => {
      if (tx.type === 'payment' || tx.type === 'return') {
        return sum - (tx.amount || 0);
      }
      return sum + (tx.amount || 0);
    }, 0);
  },

  async getLedger(supplierId: string, limit: number = 50, offset: number = 0, manualOnly: boolean = false) {
    const query = localDb.supplierTransactions.where('supplierId').equals(supplierId);

    let txs = await query.toArray();

    // Sort and paginate manually for now if Dexie query is complex
    txs = txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const paginated = txs.slice(offset, offset + limit);

    return paginated.map(tx => ({
      id: tx.id,
      date: tx.createdAt,
      type: tx.type,
      sourceType: tx.sourceType || (tx.type === 'opening_balance' ? 'opening_balance' : tx.type === 'payment' ? 'payment' : 'manual_bill'),
      detail: tx.note || tx.referenceType || 'Transaction',
      debit: (tx.type === 'payment' || tx.type === 'return') ? tx.amount : 0,
      credit: (tx.type === 'purchase' || tx.type === 'opening_balance' || tx.type === 'loan') ? tx.amount : 0,
      isManualOverride: tx.isManualOverride || false,
      overrideBy: tx.overrideBy || null,
    }));
  },

  async recordPayment(data: { supplier_id: string; amount: number; payment_type: string; note?: string; isManualOverride?: boolean; overrideBy?: string; expenseId?: string }) {
    const id = generateId();
    const tx: any = {
      id,
      supplierId: data.supplier_id,
      type: 'payment',
      sourceType: 'payment' as const,
      amount: data.amount,
      note: data.note,
      paymentType: data.payment_type,
      isManualOverride: data.isManualOverride || false,
      overrideBy: data.overrideBy || undefined,
      expenseId: data.expenseId,
      createdAt: new Date()
    };
    await localDb.supplierTransactions.add(tx);
    await queueOp('supplier_transactions', 'create', id, toRemoteSupplierTransaction(tx));
    // Wallet deduction: paying supplier = money OUT of our register
    await adjustPaymentBalances([{
      id: generateId(),
      modeId: normalizePaymentMethod(data.payment_type || 'cash'),
      delta: -data.amount,
      referenceId: id,
      note: `Supplier payment: ${data.note || ''}`,
    }]);
    return tx;
  },

  async recordBill(data: { supplierId: string; amount: number; note?: string; referenceId?: string; sourceType?: 'auto_purchase' | 'manual_bill' | 'opening_balance'; isManualOverride?: boolean; overrideBy?: string }) {
    // X9 GUARD: never create a second supplier bill for the same stock-in / purchase record.
    // Both PurchaseOrderSystem & BatchStockInSystem (and ProductDetailHub) funnel through
    // commitStockInToInventory → recordBill with referenceId = purchase record id. Without this
    // guard a re-run / double receive of the same delivery would double-count the payable.
    if (data.referenceId) {
      const existing = (await localDb.supplierTransactions.toArray())
        .find(t => t.referenceId === data.referenceId);
      if (existing) return existing;
    }
    const id = generateId();
    const inferredType = data.note === 'Opening Balance' ? 'opening_balance' : 'purchase';
    const inferredSourceType = data.sourceType || (inferredType === 'opening_balance' ? 'opening_balance' : 'manual_bill');
    const tx: any = {
      id,
      supplierId: data.supplierId,
      type: inferredType,
      sourceType: inferredSourceType,
      amount: data.amount,
      note: data.note,
      referenceId: data.referenceId,
      isManualOverride: data.isManualOverride || false,
      overrideBy: data.overrideBy || undefined,
      createdAt: new Date()
    };
    await localDb.supplierTransactions.add(tx);
    await queueOp('supplier_transactions', 'create', id, toRemoteSupplierTransaction(tx));
    return tx;
  },

  async deleteTransaction(id: string) {
    // Cascade: a supplier PAYMENT also creates a linked expense row.
    // Delete the orphaned expense too, otherwise expense totals stay inflated.
    try {
      const tx: any = await localDb.supplierTransactions.get(id);
      if (tx?.expenseId) {
        await localDb.expenses.delete(tx.expenseId);
        queueOp('expenses', 'delete', tx.expenseId, {});
      }
    } catch (e) {
      console.warn('deleteTransaction: failed to cascade expense cleanup', e);
    }
    await localDb.supplierTransactions.delete(id);
    queueOp('supplier_transactions', 'delete', id, {});
  },

  // Update a previously-recorded supplier bill (used when a linked Supplies
  // expense is edited). Keeps the supplier payable in sync with the expense amount.
  async updateBill(id: string, updates: { amount?: number; note?: string }) {
    const tx: any = await localDb.supplierTransactions.get(id);
    if (!tx) return null;
    const updated = { ...tx, ...updates, updatedAt: new Date() };
    await localDb.supplierTransactions.put(updated);
    await queueOp('supplier_transactions', 'update', id, toRemoteSupplierTransaction(updated));
    return updated;
  },

  async fetchRemote(lastSyncTime?: Date): Promise<Supplier[]> {
    const queryFn = () => {
      let q = supabase.from('suppliers').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapSupplier);
  }
};


/**
 * Purchase Orders Service
 */
export const purchaseOrdersService = {
  async getAll(): Promise<PurchaseOrder[]> {
    return await localDb.purchaseOrders.toArray();
  },

  async getById(id: string): Promise<PurchaseOrder | null> {
    return await localDb.purchaseOrders.get(id) || null;
  },

  async create(po: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> {
    const id = generateId();
    const now = new Date();
    const newPO = { ...po, id, createdAt: now, updatedAt: now } as PurchaseOrder;
    await localDb.purchaseOrders.add(newPO);
    queueOp('purchase_orders', 'create', id, {
      id,
      po_number: po.poNumber,
      supplier_id: po.supplierId,
      status: po.status || 'draft',
      total_amount: po.totalAmount || 0,
      notes: po.notes,
      received_at: po.receivedAt ? po.receivedAt.toISOString() : null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    });
    return newPO;
  }
};

/**
 * Settings Service
 */
export const supplierTransactionsService = {
  async fetchRemote(lastSyncTime?: Date): Promise<SupplierTransaction[]> {
    const queryFn = () => {
      let q = supabase.from('supplier_transactions').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    let data;
    try {
      data = await fetchAllPages(queryFn);
    } catch {
      // Fallback: fetch all if updated_at column doesn't exist
      console.warn('[supplierTransactions] Delta sync failed, fetching all');
      data = await fetchAllPages(() => supabase.from('supplier_transactions').select('*'));
    }
    return data.map((item: any) => ({
      ...item,
      supplierId: item.supplier_id ?? item.supplierId,
      referenceId: item.reference_id ?? item.referenceId,
      referenceType: item.reference_type ?? item.referenceType,
      balanceAfter: item.balance_after ?? item.balanceAfter,
      paymentMethod: item.payment_method ?? item.paymentMethod,
      createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
    }));
  }
};

/**
 * Stock History Service
 */
