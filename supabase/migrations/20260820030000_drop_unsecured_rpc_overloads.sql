-- ============================================================================
-- 20260820030000_drop_unsecured_rpc_overloads
-- ----------------------------------------------------------------------------
-- SECURITY: remove the token-less overloads of delete_sale_atomic / refund_sale_atomic.
-- The app ALWAYS calls these RPCs with an action token (signAction) → resolves to
-- the 7-arg guarded version (require_action). The 2-arg / 4-arg overloads have NO
-- require_action token check, so any anonymous caller could delete/refund any sale
-- by UUID. No DB-internal function calls these (verified by grep). Safe to drop.
-- NOTE: also remove the matching CREATE blocks from SUPER_MASTER_SCHEMA.sql.
-- ============================================================================

DROP FUNCTION IF EXISTS public.delete_sale_atomic(uuid, jsonb);
DROP FUNCTION IF EXISTS public.refund_sale_atomic(uuid, jsonb, text, numeric);
