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

export const activeReturns = new Set<string>();

/**
 * Standard Utility for ID generation
 */

// ============================================================================
// ATOMIC COMMIT HELPERS (Phase 1 — Online-authoritative + offline buffer)
// These wrap the server-side `commit_sale` / `apply_stock_movements` RPCs so a
// sale + ALL its stock movements are written in ONE Postgres transaction. This
// guarantees products.stock / variant_data can NEVER diverge from sales.
// Returns `true` only when the cloud write actually succeeded, so the caller can
// skip the legacy per-op queue path (idempotent ids prevent double writes).
// ============================================================================

export async function commitSaleAuthoritative(
  remoteSale: any,
  movements: any[]
): Promise<any> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    // MASTER §5.2: reuse the sale id as the client-generated idempotency key so a
    // retry / offline replay of the SAME local sale is a no-op server-side, not a
    // second sale. Stable across retries because the local sale id never changes.
    const salePayload = { ...remoteSale, idempotency_key: remoteSale?.id };
    const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
    const { data, error } = await Promise.race([
      (supabase as any).rpc('commit_sale', {
        p_sale: salePayload,
        p_history: movements,
      }),
      timeoutPromise
    ]);
    if (error) {
      console.error('[commit_sale] RPC error:', error.message);
      return null;
    }
    return data;
  } catch (e: any) {
    console.error('[commit_sale] exception:', e?.message || e);
    return null;
  }
}

// Revert a locally-written sale + restore local product stock when the cloud
// reports it was already fulfilled by another device (race on the same order).
export async function revertLocalSaleStock(saleId: string, movements: any[]) {
  try {
    await localDb.sales.delete(saleId);
    for (const m of movements || []) {
      const pid = m?.product_id || m?.productId;
      if (!pid) continue;
      if (m?.variant_id || m?.variantId) continue;
      const p = await localDb.products.get(pid);
      if (p) {
        const qty = Number(m.change_qty ?? m.changeQty) || 0;
        // Sale movement change_qty is NEGATIVE (e.g. -5 sold). To RESTORE local stock
        // we must add the absolute amount: stock - change_qty = stock + 5.
        await localDb.products.update(pid, { stock: (p.stock || 0) - qty });
      }
    }
  } catch (e) {
    console.warn('[revertLocalSaleStock] failed:', e);
  }
}

export async function applyStockMovementsRemote(movements: any[]): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    const { error } = await (supabase as any).rpc('apply_stock_movements', {
      p_history: movements,
    });
    if (error) {
      console.error('[apply_stock_movements] RPC error:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('[apply_stock_movements] exception:', e?.message || e);
    return false;
  }
}

/**
 * Atomic sale delete: reverse stock (stock_history/variant_stock_history) AND
 * hard-delete the sale in ONE cloud transaction. Idempotent via RPC.
 * p_history may be [] for sales that need no stock reversal (e.g. drafts).
 */
export async function deleteSaleAtomic(saleId: string, movements: any[]): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    const token = await signAction('delete_sale');
    const base: any = { p_sale_id: saleId, p_history: movements };
    if (token) { base.p_user_id = token.p_user_id; base.p_role = token.p_role; base.p_sig = token.p_sig; }
    const { error } = await (supabase as any).rpc('delete_sale_atomic', base);
    if (error) { console.error('[delete_sale_atomic] RPC error:', error.message); return false; }
    return true;
  } catch (e: any) {
    console.error('[delete_sale_atomic] exception:', e?.message || e);
    return false;
  }
}

/**
 * Atomic refund: reverse stock AND update sale status/refunded_amount in ONE
 * cloud transaction. p_refunded_amount is the ABSOLUTE new total (idempotent on retry).
 */
export async function refundSaleAtomic(saleId: string, movements: any[], status: string, refundedAmount: number): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    const token = await signAction('refund_sale');
    const base: any = {
      p_sale_id: saleId,
      p_history: movements,
      p_status: status,
      p_refunded_amount: refundedAmount,
    };
    if (token) { base.p_user_id = token.p_user_id; base.p_role = token.p_role; base.p_sig = token.p_sig; }
    const { error } = await (supabase as any).rpc('refund_sale_atomic', base);
    if (error) { console.error('[refund_sale_atomic] RPC error:', error.message); return false; }
    return true;
  } catch (e: any) {
    console.error('[refund_sale_atomic] exception:', e?.message || e);
    return false;
  }
}

/**
 * Generic helper to fetch all rows across pagination limits (default 1000) for full cache initialization or delta sync.
 */
