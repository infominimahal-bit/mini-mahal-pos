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
  { id: 'cash', name: 'Cash', icon: 'cash', isActive: true },
  { id: 'card', name: 'Card', icon: 'credit-card', isActive: true },
  { id: 'online', name: 'Online Wallet', icon: 'globe', isActive: true },
];

/** Normalize legacy 'digital'/'wallet' methods to 'online' wallet. */
export const mapPaymentMode = (item: any) => ({
  id: item.id,
  name: item.name,
  icon: item.icon,
  balance: Number(item.balance || 0),
  isActive: item.is_active ?? item.isActive ?? true,
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
});

export const toRemotePaymentMode = (m: any) => ({
  id: m.id,
  name: m.name,
  icon: m.icon,
  balance: m.balance,
  is_active: m.isActive ?? true,
  updated_at: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
});

/** Idempotent seed: ensures default wallets exist locally + in cloud, and
 *  removes legacy/extra modes (e.g. 'wallet') merging any balance into 'online'. */
export const seedPaymentModes = async () => {
  const defaultIds = new Set(DEFAULT_PAYMENT_MODES.map(m => m.id));
  const existing = await localDb.paymentModes.toArray();
  const existingIds = new Set(existing.map((m: any) => m.id));
  for (const m of DEFAULT_PAYMENT_MODES) {
    if (!existingIds.has(m.id)) {
      await localDb.paymentModes.put({ ...m, balance: 0, updatedAt: new Date() });
    } else {
      // Reconcile display name (e.g. 'Online' → 'Online Wallet') without touching balance
      const cur = existing.find((x: any) => x.id === m.id);
      if (cur && cur.name !== m.name) {
        await localDb.paymentModes.update(m.id, { name: m.name, updatedAt: new Date() });
      }
    }
  }
  // Cleanup legacy modes (transfer any balance → online, then delete)
  for (const m of existing) {
    if (!defaultIds.has(m.id)) {
      const bal = Number(m.balance || 0);
      if (bal !== 0) {
        const onlineMode = await localDb.paymentModes.get('online');
        if (onlineMode) {
          await localDb.paymentModes.update('online', {
            balance: Number(onlineMode.balance || 0) + bal,
            updatedAt: new Date(),
          });
        }
      }
      await localDb.paymentModes.delete(m.id);
    }
  }
  try {
    // OFFLINE-FIRST: always route via queue (SyncEngine replicates to cloud).
    for (const m of await localDb.paymentModes.toArray()) {
      await queueOp('payment_modes', 'upsert', m.id, toRemotePaymentMode(m));
    }
    for (const id of existing.filter(m => !defaultIds.has(m.id)).map((m: any) => m.id)) {
      await queueOp('payment_modes', 'delete', id, {});
    }
  } catch (e) { console.warn('[paymentModes] cloud seed failed', e); }
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
  for (const mv of moves) {
    const mode = await localDb.paymentModes.get(mv.modeId);
    if (mode) {
      await localDb.paymentModes.update(mv.modeId, {
        balance: Number(mode.balance || 0) + Number(mv.delta),
        updatedAt: new Date(),
      });
    }
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
      delta: Math.abs(Number(p.amount || 0)),
      referenceId: ref,
      note: `Sale ${sale.invoiceNumber || ref}`,
    }));
  }
  return [{
    id: generateId(),
    modeId: normalizePaymentMethod(sale.paymentMethod),
    delta: Math.abs(Number(sale.total || 0)),
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
  }
};



// auditStockIntegrity removed — batch system deprecated
/**
 * Barcode Seeding / Population (RULE F1 / CODE 128)
 * Fetches existing products where barcode_value is null or empty,
 * generates a ZP-{5-digit} barcode for each, and updates cloud and local database.
 */
