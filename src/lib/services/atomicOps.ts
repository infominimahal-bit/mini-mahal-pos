import { supabase } from '../supabase';
import { localDb } from '../localDb';
import { signAction } from '../actionToken';

export const activeReturns = new Set<string>();

/**
 * RBAC: thrown when the server rejects a privileged op with FORBIDDEN /
 * APPROVAL_REQUIRED so the UI can offer the supervisor (admin PIN) override
 * instead of showing a generic failure.
 */
export class ApprovalRequiredError extends Error {}

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
  movements: any[],
  paymentMoves: any[] = [],
  customerLedger: any = null,
  maxTries = 2
): Promise<any> {
  let _lastErr: any = null;
  for (let attempt = 0; attempt < maxTries; attempt++) {
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
          p_payment_moves: paymentMoves,
          p_customer_ledger: customerLedger
        }),
        timeoutPromise
      ]);
      if (error) {
        _lastErr = error;
        if (attempt < maxTries - 1) { await new Promise((r) => setTimeout(r, 400)); continue; }
        console.error('[commit_sale] RPC error:', error.message);
        return null;
      }
      return data;
    } catch (e: any) {
      _lastErr = e;
      if (attempt < maxTries - 1) { await new Promise((r) => setTimeout(r, 400)); continue; }
      console.error('[commit_sale] exception:', e?.message || e);
      return null;
    }
  }
  return null;
}

// Revert a locally-written sale + restore local product/variant stock when the
// cloud rejects the commit (offline first failure) or reports it was already
// fulfilled by another device. This is what enforces ALL-OR-NOTHING for online
// sales: a failed cloud commit leaves NO half-written local state behind.
export async function revertLocalSaleStock(saleId: string, movements: any[]) {
  try {
    await localDb.sales.delete(saleId);
    for (const m of movements || []) {
      const pid = m?.product_id || m?.productId;
      if (!pid) continue;
      const p = await localDb.products.get(pid);
      if (!p) continue;
      const qty = Number(m.change_qty ?? m.changeQty) || 0;
      const vid = m?.variant_id || m?.variantId;
      if (vid && Array.isArray((p as any).variantData)) {
        // Sale movement change_qty is NEGATIVE (e.g. -5 sold). To RESTORE local
        // variant stock we add the absolute amount: stock - change_qty = stock + 5.
        const updated = ((p as any).variantData as any[]).map((v) =>
          v.id === vid ? { ...v, stock: (Number(v.stock) || 0) - qty } : v
        );
        await localDb.products.update(pid, { variantData: updated, updatedAt: new Date() });
      } else {
        // Sale movement change_qty is NEGATIVE (e.g. -5 sold). To RESTORE local
        // stock we add the absolute amount: stock - change_qty = stock + 5.
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
export async function deleteSaleAtomic(saleId: string, movements: any[], paymentMoves: any[] = [], customerLedger: any = null, overrideToken?: { p_user_id: string; p_role: string; p_sig: string } | null): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    const token = overrideToken ?? await signAction('delete_sale');
    const base: any = { p_sale_id: saleId, p_history: movements, p_payment_moves: paymentMoves, p_customer_ledger: customerLedger };
    if (token) { base.p_user_id = token.p_user_id; base.p_role = token.p_role; base.p_sig = token.p_sig; }
    const { error } = await (supabase as any).rpc('delete_sale_atomic', base);
    if (error) {
      if (/FORBIDDEN|APPROVAL_REQUIRED/i.test(error.message || '')) throw new ApprovalRequiredError(error.message);
      console.error('[delete_sale_atomic] RPC error:', error.message); return false;
    }
    return true;
  } catch (e: any) {
    if (e instanceof ApprovalRequiredError) throw e;
    console.error('[delete_sale_atomic] exception:', e?.message || e);
    return false;
  }
}

/**
 * Atomic refund: reverse stock AND update sale status/refunded_amount in ONE
 * cloud transaction. p_refunded_amount is the ABSOLUTE new total (idempotent on retry).
 */
export async function refundSaleAtomic(saleId: string, movements: any[], status: string, refundedAmount: number, paymentMoves: any[] = [], customerLedger: any = null, overrideToken?: { p_user_id: string; p_role: string; p_sig: string } | null): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    const token = overrideToken ?? await signAction('refund_sale');
    const base: any = {
      p_sale_id: saleId,
      p_history: movements,
      p_status: status,
      p_refunded_amount: refundedAmount,
      p_payment_moves: paymentMoves,
      p_customer_ledger: customerLedger
    };
    if (token) { base.p_user_id = token.p_user_id; base.p_role = token.p_role; base.p_sig = token.p_sig; }
    const { error } = await (supabase as any).rpc('refund_sale_atomic', base);
    if (error) {
      if (/FORBIDDEN|APPROVAL_REQUIRED/i.test(error.message || '')) throw new ApprovalRequiredError(error.message);
      console.error('[refund_sale_atomic] RPC error:', error.message); return false;
    }
    return true;
  } catch (e: any) {
    if (e instanceof ApprovalRequiredError) throw e;
    console.error('[refund_sale_atomic] exception:', e?.message || e);
    return false;
  }
}

/**
 * Generic helper to fetch all rows across pagination limits (default 1000) for full cache initialization or delta sync.
 */
