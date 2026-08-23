-- ============================================================================
-- RBAC HARDEN (2026-08-23) — permanent permission matrix enforcement
-- ----------------------------------------------------------------------------
-- 1. verify_action_token: FAIL-CLOSED. Removes legacy branch that returned true
--    when sig was missing AND stored action_hash was NULL.
-- 2. stock_adjustment: adds signed actor proof (p_user_id/p_role/p_sig) and
--    require_action('stock_adjustment', ['admin','manager']) — RBAC matrix:
--    Inventory Adjustment admin+manager only, cashier NEVER.
-- Idempotent. Run via Management API.
-- ============================================================================

-- ── 1. verify_action_token (fail-closed) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_action_token(p_user_id uuid, p_role text, p_action text, p_sig text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_hash text; v_stored_role text; v_expected text;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  -- Fail-closed: no signature => deny (no more NULL-hash bypass).
  IF p_sig IS NULL OR p_sig = '' THEN RETURN false; END IF;
  SELECT action_hash, role INTO v_hash, v_stored_role FROM users WHERE id = p_user_id;
  IF v_hash IS NULL OR v_stored_role IS NULL THEN RETURN false; END IF;
  IF v_stored_role <> p_role THEN RETURN false; END IF;
  v_expected := encode(digest(v_hash || '|' || p_user_id::text || '|' || p_role || '|' || p_action, 'sha256'), 'hex');
  RETURN v_expected = p_sig;
END;
$function$;

-- ── 2. stock_adjustment (admin|manager guarded, idempotent preserved) ──────
CREATE OR REPLACE FUNCTION public.stock_adjustment(p_product_id uuid, p_change_qty integer, p_type text, p_note text, p_cashier text, p_variant_id text DEFAULT NULL::text, p_variant_label text DEFAULT NULL::text, p_adjustment_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_sig text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_id uuid := COALESCE(p_adjustment_id, gen_random_uuid());
BEGIN
  PERFORM public.require_action(p_user_id, p_role, 'stock_adjustment', p_sig, VARIADIC ARRAY['admin','manager']::text[]);
  IF p_variant_id IS NOT NULL AND p_variant_id <> '' THEN
    INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, note, cashier_name, created_at, updated_at)
    VALUES (v_id, p_product_id, p_variant_id, COALESCE(p_variant_label, ''), p_change_qty, p_type, p_note, p_cashier, now(), now())
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO stock_history (id, product_id, change_qty, type, note, cashier_name, created_at, updated_at)
    VALUES (v_id, p_product_id, p_change_qty, p_type, p_note, p_cashier, now(), now())
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$function$;

-- ── 3. Drop legacy unguarded 8-param overload of stock_adjustment ───────────
-- (CREATE OR REPLACE with new signature leaves the old unguarded one alive.)
DROP FUNCTION IF EXISTS public.stock_adjustment(uuid, integer, text, text, text, text, text, uuid);
