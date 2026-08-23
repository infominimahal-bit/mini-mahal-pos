-- ============================================================================
-- RBAC FINAL (2026-08-23) — server-level enforcement of POS permission matrix
-- ----------------------------------------------------------------------------
-- 1. delete_sale_atomic: sale reverse/delete = ADMIN ONLY (manager/cashier need
--    supervisor override). DRAFT sales (status='pending' + DRAFT_SALE note)
--    stay deletable by any role (no stock impact, F13).
-- 2. refund_sale_atomic: refunds above app_settings.refund_approval_threshold
--    require role='admin' (supervisor override). Lower refunds remain open to
--    admin|manager|cashier per matrix ("limited refunds").
-- Idempotent. Run via Management API.
-- ============================================================================

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS refund_approval_threshold NUMERIC NOT NULL DEFAULT 5000;

-- ── delete_sale_atomic (admin-only guarded; drafts exempt) ──────────────
CREATE OR REPLACE FUNCTION public.delete_sale_atomic(p_sale_id uuid, p_history jsonb, p_user_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_sig text DEFAULT NULL::text, p_payment_moves jsonb DEFAULT '[]'::jsonb, p_customer_ledger jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  h jsonb;
  v_status text;
  v_notes text;
BEGIN
  SELECT status, COALESCE(notes, '') INTO v_status, v_notes FROM sales WHERE id = p_sale_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'already_deleted');
  END IF;

  -- F13 DRAFT RULE: saved carts never touched stock/customer/revenue, so any
  -- role may discard them. Everything else requires an ADMIN action token.
  IF v_status = 'pending' AND v_notes LIKE '%DRAFT_SALE%' THEN
    NULL;
  ELSE
    PERFORM public.require_action(p_user_id, p_role, 'delete_sale', p_sig, VARIADIC ARRAY['admin']::text[]);
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

  UPDATE sales SET status = 'deleted', deleted_at = now(), updated_at = now() WHERE id = p_sale_id;
  INSERT INTO row_tombstones (table_name, ref_id, deleted_at) VALUES ('sales', p_sale_id, now()) ON CONFLICT (table_name, ref_id) DO UPDATE SET deleted_at = EXCLUDED.deleted_at;

  RETURN jsonb_build_object('success', true, 'id', p_sale_id);
END;
$function$;

-- ── refund_sale_atomic (threshold approval for non-admin) ───────────────
CREATE OR REPLACE FUNCTION public.refund_sale_atomic(p_sale_id uuid, p_history jsonb, p_status text, p_refunded_amount numeric, p_user_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_sig text DEFAULT NULL::text, p_payment_moves jsonb DEFAULT '[]'::jsonb, p_customer_ledger jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  h jsonb;
  _total numeric;
  _status text;
  _prior numeric;
  _threshold numeric;
BEGIN
  PERFORM public.require_action(p_user_id, p_role, 'refund_sale', p_sig, VARIADIC array['admin', 'manager', 'cashier']);

  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id) THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'sale_missing');
  END IF;

  SELECT total, status, COALESCE(refunded_amount, 0)
    INTO _total, _status, _prior
    FROM sales WHERE id = p_sale_id;

  -- double-reversal guard (see migration 20260822040000):
  --   deleted / fully-refunded / no-forward-progress => no-op (skip all reversals)
  IF _status = 'deleted' THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'sale_deleted_noop');
  END IF;
  IF _status = 'refunded' THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'already_fully_refunded', 'refunded_amount', _prior);
  END IF;
  IF p_refunded_amount <= _prior + 0.001 THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'noop_no_increase', 'refunded_amount', _prior);
  END IF;
  IF _total IS NOT NULL AND p_refunded_amount > _total + 0.001 THEN
    RAISE EXCEPTION 'FORBIDDEN: refund amount exceeds sale total' USING ERRCODE = '42501';
  END IF;

  -- RBAC: refunds above the configured threshold need an ADMIN token
  -- (manager/cashier must obtain supervisor override in the UI).
  IF p_role IS DISTINCT FROM 'admin' THEN
    SELECT refund_approval_threshold INTO _threshold FROM app_settings WHERE id = '00000000-0000-4000-8000-000000000001';
    IF COALESCE(_threshold, 0) > 0 AND (p_refunded_amount - _prior) > _threshold THEN
      RAISE EXCEPTION 'APPROVAL_REQUIRED: refund exceeds admin approval threshold' USING ERRCODE = '42501';
    END IF;
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
