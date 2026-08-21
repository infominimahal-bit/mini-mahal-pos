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
import { fetchAllPages, normalizePaymentMethod } from './utils';

export const toRemotePayment = (p: any) => {
  const remote: any = {};
  if ('id' in p) remote.id = p.id;
  if ('customerId' in p) remote.customer_id = p.customerId;
  if ('customer_id' in p) remote.customer_id = p.customer_id;
  if ('supplierId' in p) remote.supplier_id = p.supplierId;
  if ('supplier_id' in p) remote.supplier_id = p.supplier_id;
  if ('amount' in p) remote.amount = Number(p.amount);
  if ('method' in p) remote.payment_type = p.method;
  if ('paymentType' in p) remote.payment_type = p.paymentType;
  if ('payment_type' in p) remote.payment_type = p.payment_type;
  if ('notes' in p) remote.note = p.notes;
  if ('note' in p) remote.note = p.note;

  if ('direction' in p) {
    remote.direction = p.direction;
  } else if (p.customerId || p.customer_id) {
    remote.direction = 'in';
  } else if (p.supplierId || p.supplier_id) {
    remote.direction = 'out';
  }

  if ('createdAt' in p) {
    remote.created_at = p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt;
  } else if ('created_at' in p) {
    remote.created_at = p.created_at instanceof Date ? p.created_at.toISOString() : p.created_at;
  }
  return remote;
};

export const mapPayment = (item: any): any => ({
  id: item.id,
  customerId: item.customer_id ?? item.customerId,
  supplierId: item.supplier_id ?? item.supplierId,
  amount: Number(item.amount),
  method: item.payment_type ?? item.method ?? item.paymentType,
  paymentType: item.payment_type ?? item.paymentType ?? item.method,
  direction: item.direction,
  notes: item.note ?? item.notes,
  note: item.note ?? item.notes,
  createdAt: item.created_at ? new Date(item.created_at) : (item.createdAt ? new Date(item.createdAt) : new Date())
});


/**
 * Products Service
 * Reads from Dexie, Writes to Dexie + Queues for Supabase
 */
// ════════════════════════════════════════════════════════════════
// PAYMENT MODES / WALLETS  (per-method authoritative balances)
// ════════════════════════════════════════════════════════════════
export const DEFAULT_PAYMENT_MODES = [
  { id: 'cash', name: 'Cash', icon: 'cash', isActive: true, isDefault: true, sortOrder: 1, color: '#22c55e' },
  { id: 'card', name: 'Card', icon: 'credit-card', isActive: true, isDefault: true, sortOrder: 2, color: '#3b82f6' },
  { id: 'online', name: 'Online Wallet', icon: 'globe', isActive: true, isDefault: true, sortOrder: 3, color: '#a855f7' },
];

/** Normalize legacy 'digital'/'wallet' methods to 'online' wallet. */
export const mapPaymentMode = (item: any) => ({
  id: item.id,
  name: item.name,
  icon: item.icon,
  balance: Number(item.balance || 0),
  isActive: item.is_active ?? item.isActive ?? true,
  isDefault: item.is_default ?? item.isDefault ?? false,
  sortOrder: item.sort_order ?? item.sortOrder ?? 99,
  color: item.color ?? item.color ?? '#6366f1',
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
});

export const toRemotePaymentMode = (m: any) => ({
  id: m.id,
  name: m.name,
  icon: m.icon,
  balance: m.balance,
  is_active: m.isActive ?? true,
  sort_order: m.sortOrder ?? 99,
  color: m.color ?? '#6366f1',
  is_default: m.isDefault ?? false,
  updated_at: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
});

/** Idempotent seed: ensures default wallets exist locally + in cloud.
 *  NEVER deletes custom modes — only ADDs defaults if missing (BUG-C03). */
export const seedPaymentModes = async () => {
  const existing = await localDb.paymentModes.toArray();
  const existingIds = new Set(existing.map((m: any) => m.id));
  for (const m of DEFAULT_PAYMENT_MODES) {
    if (!existingIds.has(m.id)) {
      await localDb.paymentModes.put({ ...m, balance: 0, isDefault: true, sortOrder: m.sortOrder, color: m.color, updatedAt: new Date() });
      await queueOp('payment_modes', 'upsert', m.id, toRemotePaymentMode({ ...m, balance: 0, isDefault: true, sortOrder: m.sortOrder, color: m.color }));
    }
  }
  for (const m of DEFAULT_PAYMENT_MODES) {
    await localDb.paymentModes.update(m.id, { isDefault: true, sortOrder: m.sortOrder, color: m.color }).catch(() => {});
  }
  // DO NOT delete non-default (custom) modes.
};

export const getPaymentModes = async () => {
  const modes = await localDb.paymentModes.toArray();
  if (modes.length === 0) { await seedPaymentModes(); return localDb.paymentModes.toArray(); }
  return modes;
};

/**
 * Atomically adjust per-method wallet balances.
 * moves: { id, modeId, delta, referenceId?, note? }
 * - Optimistically updates local Dexie (instant UI).
 * - Online: applies via idempotent RPC (payment_movements ledger).
 * - Offline/failed: queued for syncEngine to flush via the same RPC.
 */
export const adjustPaymentBalances = async (moves: any[], opts?: any) => {
  if (!moves || moves.length === 0) return;
  if (!opts?.batchId) console.warn('[wallet] No batchId — idempotency not guaranteed');
  const now = new Date();
  for (const mv of moves) {
    const mode = await localDb.paymentModes.get(mv.modeId);
    if (mode) {
      await localDb.paymentModes.update(mv.modeId, {
        balance: Number(mode.balance || 0) + Number(mv.delta),
        updatedAt: now,
      });
    }
    await localDb.payment_movements.add({
      id: mv.id || generateId(),
      modeId: mv.modeId,
      delta: Number(mv.delta),
      referenceId: mv.referenceId || null,
      referenceType: mv.referenceType || null,
      note: mv.note || null,
      createdAt: now,
    }).catch(() => {});
  }
  const remoteMoves = moves.map(mv => ({
    id: mv.id || generateId(),
    mode_id: mv.modeId,
    delta: Number(mv.delta),
    reference_id: mv.referenceId || null,
    note: mv.note || null,
  }));
  // OFFLINE-FIRST: always route through the queue; SyncEngine replays via apply_payment_movements RPC.
  await queueOp('payment_movements', 'apply', opts?.batchId || generateId(), remoteMoves, opts);
};

/** Build wallet moves for a completed sale (handles split + single method). */
export const buildSalePaymentMoves = (sale: any): any[] => {
  const ref = sale.id;
  if (sale.paymentMethod === 'split' && sale.splitPayments?.length) {
    return sale.splitPayments.map((p: any) => ({
      id: generateId(),
      modeId: normalizePaymentMethod(p.method),
      delta: Number(p.amount || 0),
      referenceId: ref,
      note: `Sale ${sale.invoiceNumber || ref}`,
    }));
  }
  return [{
    id: generateId(),
    modeId: normalizePaymentMethod(sale.paymentMethod),
    delta: Number(sale.total || 0),
    referenceId: ref,
    note: `Sale ${sale.invoiceNumber || ref}`,
  }];
};

/** Build reverse wallet moves (used on refund / delete). */
export const buildReversePaymentMoves = (sale: any, ratio = 1): any[] => {
  const ref = sale.id;
  if (sale.paymentMethod === 'split' && sale.splitPayments?.length) {
    return sale.splitPayments.map((p: any) => ({
      id: generateId(),
      modeId: normalizePaymentMethod(p.method),
      delta: -Math.abs(Number(p.amount || 0)) * ratio,
      referenceId: ref,
      note: `Reverse ${sale.invoiceNumber || ref}`,
    }));
  }
  return [{
    id: generateId(),
    modeId: normalizePaymentMethod(sale.paymentMethod),
    delta: -Math.abs(Number(sale.total || 0)) * ratio,
    referenceId: ref,
    note: `Reverse ${sale.invoiceNumber || ref}`,
  }];
};

/**
 * Build wallet moves for a REFUND.
 * Rule (BUG-C01/C08): same-wallet refund reverses proportionally across the
 * original wallets; a DIFFERENT chosen wallet deducts ONLY that wallet.
 */
export const buildRefundPaymentMoves = (sale: any, refundAmount: number, refundWalletId?: string): any[] => {
  const refWallet = refundWalletId ? normalizePaymentMethod(refundWalletId) : null;
  const origWallets = sale.paymentMethod === 'split' && sale.splitPayments?.length
    ? sale.splitPayments.map((p: any) => normalizePaymentMethod(p.method))
    : [normalizePaymentMethod(sale.paymentMethod)];

  const isDiff = refWallet && !origWallets.includes(refWallet);
  if (isDiff) {
    return [{
      id: generateId(), modeId: refWallet!, delta: -Math.abs(refundAmount),
      referenceId: sale.id, referenceType: 'refund',
      note: `Refund ${sale.invoiceNumber || sale.id}`,
    }];
  }
  const ratio = sale.total > 0 ? refundAmount / sale.total : 0;
  if (sale.paymentMethod === 'split' && sale.splitPayments?.length) {
    return sale.splitPayments.map((p: any) => ({
      id: generateId(), modeId: normalizePaymentMethod(p.method),
      delta: -Math.abs(Number(p.amount || 0)) * ratio,
      referenceId: sale.id, referenceType: 'refund', note: `Refund ${sale.invoiceNumber}`,
    }));
  }
  return [{
    id: generateId(), modeId: normalizePaymentMethod(sale.paymentMethod),
    delta: -Math.abs(refundAmount), referenceId: sale.id, referenceType: 'refund',
    note: `Refund ${sale.invoiceNumber}`,
  }];
};

export const paymentModesService = {
  async fetchRemote(lastSyncTime?: Date): Promise<Payment[]> {
    const queryFn = () => {
      let q = supabase.from('payments').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    let data;
    try {
      data = await fetchAllPages(queryFn);
    } catch {
      // Fallback: fetch all if updated_at column doesn't exist
      console.warn('[payments] Delta sync failed, fetching all');
      data = await fetchAllPages(() => supabase.from('payments').select('*'));
    }
    return data.map((item: any) => ({
      ...item,
      createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
    }));
  },

  async getAll() {
    const modes = await localDb.paymentModes.toArray();
    if (!modes.length) { await seedPaymentModes(); return localDb.paymentModes.toArray(); }
    return modes.sort((a: any, b: any) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  },

  async create(data: { name: string; icon?: string; color?: string }) {
    const id = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!id) throw new Error('Invalid wallet name');
    const mode = {
      id, name: data.name, icon: data.icon || 'wallet', balance: 0,
      isActive: true, isDefault: false, sortOrder: 99, color: data.color || '#6366f1',
      updatedAt: new Date(),
    };
    await localDb.paymentModes.put(mode);
    await queueOp('payment_modes', 'upsert', id, toRemotePaymentMode(mode));
    return mode;
  },

  async delete(id: string) {
    const mode = await localDb.paymentModes.get(id);
    if (!mode) return;
    if ((mode as any).isDefault) throw new Error('Cannot delete default wallet');
    if (Math.abs(Number((mode as any).balance || 0)) > 0.01) throw new Error('Balance must be 0 before deletion');
    await localDb.paymentModes.delete(id);
    await queueOp('payment_modes', 'delete', id, {});
  },

  async transfer(fromId: string, toId: string, amount: number, note?: string) {
    if (amount <= 0) throw new Error('Amount must be positive');
    const from = await localDb.paymentModes.get(fromId);
    if (!from || Number((from as any).balance || 0) < amount) throw new Error('Insufficient balance');
    const transferId = generateId();
    await adjustPaymentBalances([
      { id: generateId(), modeId: fromId, delta: -amount, referenceId: transferId, referenceType: 'transfer', note: note || `Transfer to wallet` },
      { id: generateId(), modeId: toId, delta: +amount, referenceId: transferId, referenceType: 'transfer', note: note || `Transfer from wallet` },
    ], { batchId: transferId });
  },
};



// auditStockIntegrity removed — batch system deprecated
/**
 * Barcode Seeding / Population (RULE F1 / CODE 128)
 * Fetches existing products where barcode_value is null or empty,
 * generates a ZP-{5-digit} barcode for each, and updates cloud and local database.
 */
