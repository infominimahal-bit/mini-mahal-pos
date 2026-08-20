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
import { mapCustomer, toRemoteCustomer, toRemoteSale } from './mappers';
import { fetchAllPages } from './utils';
import { mapPayment } from './paymentsService';

export async function recordCustomerLedger(entry: {
  customerId: string;
  saleId?: string;
  type: 'sale' | 'payment' | 'refund' | 'adjustment' | 'credit' | 'opening';
  debit?: number;
  credit?: number;
  reference?: string;
  note?: string;
  createdBy?: string;
}): Promise<number> {
  try {
    const prevRows = await localDb.customerLedger.where('customerId').equals(entry.customerId).toArray();
    // Order by createdAt (NOT Dexie insertion PK order) so the running balance is
    // computed from the true chronological last entry — avoids drift when ids are
    // generated out of order across devices/offline.
    const sortedRows = prevRows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const prev = sortedRows.length ? Number(sortedRows[sortedRows.length - 1].balanceAfter || 0) : 0;
    const balanceAfter = prev + (entry.debit || 0) - (entry.credit || 0);
    const ledgerId = generateId();
    const row: any = {
      id: ledgerId,
      customerId: entry.customerId,
      saleId: entry.saleId || null,
      type: entry.type,
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      balanceAfter,
      reference: entry.reference || null,
      note: entry.note || null,
      createdBy: entry.createdBy || null,
      createdAt: new Date(),
    };
    await localDb.customerLedger.add(row);
    await queueOp('customer_ledger', 'create', ledgerId, toRemoteCustomerLedger(row));
    return balanceAfter;
  } catch (e: any) {
    console.error('[customer_ledger] record failed (non-fatal):', e?.message || e);
    return 0;
  }
}



export const toRemoteCustomerLedger = (l: any) => ({
  id: l.id,
  customer_id: l.customerId,
  sale_id: l.saleId || null,
  type: l.type,
  debit: l.debit || 0,
  credit: l.credit || 0,
  balance_after: l.balanceAfter || 0,
  reference: l.reference || null,
  note: l.note || null,
  created_by: l.createdBy || null,
  created_at: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
});

export const customersService = {
  async getAll(): Promise<Customer[]> {
    return await localDb.customers.toArray();
  },

  async fetchRemote(lastSyncTime?: Date): Promise<Customer[]> {
    const queryFn = () => {
      let q = supabase.from('customers').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapCustomer);
  },

  async create(customer: Omit<Customer, 'id'>): Promise<Customer> {
    const id = generateId();
    const now = new Date();
    const newCustomer = { ...customer, id, createdAt: now } as Customer;

    await localDb.customers.add(newCustomer);
    await queueOp('customers', 'create', id, toRemoteCustomer(newCustomer));

    return newCustomer;
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    const existing = await localDb.customers.get(id);
    if (!existing) throw new Error('Customer not found');

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    await localDb.customers.put(updated);
    await queueOp('customers', 'update', id, toRemoteCustomer({ ...updates, updatedAt: updated.updatedAt }));

    return updated;
  },

  async delete(id: string): Promise<void> {
    await localDb.customers.delete(id);
    queueOp('customers', 'delete', id, {});
  },

  async getCustomerPayments(customerId: string): Promise<any[]> {
    const all = await localDb.payments.toArray();
    return all
      .map(mapPayment)
      .filter((p: any) => p.customerId === customerId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};

