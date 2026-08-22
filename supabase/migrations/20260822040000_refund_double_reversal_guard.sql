-- ============================================================================
-- Migration: refund_sale_atomic — server-side double-reversal guard (Stage 2)
-- Date: 2026-08-22
-- ============================================================================
-- CONTEXT
--   delete_sale_atomic is already idempotent: it checks `deleted_at IS NULL`
--   before reversing, so a repeated delete is a safe no-op. refund_sale_atomic
--   had NO equivalent guard: it blindly appended reversal stock_history +
--   payment_movements and overwrote refunded_amount on every call.
--
--   The only protection was a FRONTEND check (`sale.status === 'refunded'`) that
--   reads the LOCAL copy. On multi-device that local copy can be stale, so two
--   devices could each fully refund the same sale -> double stock restore +
--   double wallet credit. This migration adds the authoritative server-side
--   guard so double-reversal is impossible regardless of the caller.
--
-- SEMANTICS (must not break legitimate partial refunds)
--   * Partial refunds are supported: the frontend tracks per-item
--     refundedQuantity and passes a CUMULATIVE p_refunded_amount, with
--     p_status = 'partially_refunded' until every item is fully refunded, then
--     'refunded'. Each genuine partial refund therefore strictly INCREASES the
--     stored refunded_amount.
--   * Guard rules (all additive, no frontend change required):
--       - sale already 'deleted'         -> no-op (cannot refund a reversed sale)
--       - sale already 'refunded' (full) -> no-op (nothing left to reverse)
--       - p_refunded_amount does NOT exceed the currently-stored refunded_amount
--         -> no forward progress => duplicate / stale / replayed refund => no-op
--         (this is what blocks the double stock-restore + double wallet credit)
--       - p_refunded_amount > sale.total -> FORBIDDEN (unchanged existing guard)
--   * A legitimate NEW partial refund always has
--     p_refunded_amount > prior refunded_amount, so it proceeds normally.
--
-- NOTE (future hardening, Stage 3)
--   The fully-general idempotency mechanism is a per-operation request_id passed
--   by the caller. That requires changing the frontend call sites, so it is done
--   together with the cloud-direct migration (Stage 3). This monotonic-amount +
--   finalized-state guard closes the double-reversal hole today with no frontend
--   change and is safe to keep afterwards.
--
--   Body is otherwise IDENTICAL to 20260821120000_atomic_sync.sql
--   (latest-wins: this file's timestamp is newer, so it is the live definition).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.refund_sale_atomic(
  p_sale_id uuid,
  p_history jsonb,
  p_status text,
  p_refunded_amount numeric,
  p_user_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_sig text DEFAULT NULL,
  p_payment_moves jsonb DEFAULT '[]'::jsonb,
  p_customer_ledger jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  h jsonb;
  _total numeric;
  _status text;
  _prior numeric;
BEGIN
  PERFORM public.require_action(p_user_id, p_role, 'refund_sale', p_sig, VARIADIC array['admin', 'manager', 'cashier']);

  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id) THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'sale_missing');
  END IF;

  SELECT total, status, COALESCE(refunded_amount, 0)
    INTO _total, _status, _prior
    FROM sales WHERE id = p_sale_id;

  -- ---- double-reversal guard -------------------------------------------------
  -- Cannot refund a sale that has already been reversed (deleted).
  IF _status = 'deleted' THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'sale_deleted_noop');
  END IF;
  -- Already fully refunded: nothing left to reverse.
  IF _status = 'refunded' THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'already_fully_refunded', 'refunded_amount', _prior);
  END IF;
  -- No forward progress vs the stored cumulative amount => duplicate / stale /
  -- replayed refund. Skip ALL reversals (stock + payment + ledger + status).
  IF p_refunded_amount <= _prior + 0.001 THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'noop_no_increase', 'refunded_amount', _prior);
  END IF;
  -- Refund can never exceed the sale total (unchanged existing guard).
  IF _total IS NOT NULL AND p_refunded_amount > _total + 0.001 THEN
    RAISE EXCEPTION 'FORBIDDEN: refund amount exceeds sale total' USING ERRCODE = '42501';
  END IF;

  FOR h IN SELECT * FROM jsonb_array_elements(p_history) LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', p_sale_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', p_sale_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  FOR h IN SELECT * FROM jsonb_array_elements(p_payment_moves) LOOP
    INSERT INTO payment_movements (id, mode_id, delta, reference_id, note, created_at)
    VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), h->>'mode_id', (h->>'delta')::numeric, p_sale_id, h->>'note', now()) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  IF p_customer_ledger IS NOT NULL AND jsonb_typeof(p_customer_ledger) = 'object' THEN
    INSERT INTO customer_ledger (id, customer_id, sale_id, type, debit, credit, balance_after, reference, note, created_by, created_at)
    VALUES (
      COALESCE((p_customer_ledger->>'id')::uuid, gen_random_uuid()), (p_customer_ledger->>'customer_id')::uuid, p_sale_id,
      p_customer_ledger->>'type', (p_customer_ledger->>'debit')::numeric, (p_customer_ledger->>'credit')::numeric,
      (p_customer_ledger->>'balance_after')::numeric, p_customer_ledger->>'reference', p_customer_ledger->>'note',
      NULLIF(p_customer_ledger->>'created_by','')::uuid, COALESCE((p_customer_ledger->>'created_at')::timestamptz, now())
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  UPDATE sales SET status = p_status, refunded_amount = p_refunded_amount, updated_at = now() WHERE id = p_sale_id;
  RETURN jsonb_build_object('success', true, 'id', p_sale_id);
END;
$function$;

COMMIT;
