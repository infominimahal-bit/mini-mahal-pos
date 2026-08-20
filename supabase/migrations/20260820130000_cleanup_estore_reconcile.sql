-- ============================================================================
-- CLEANUP MIGRATION: Remove estore triggers/functions + reconcile functions
-- These are no longer used after estore removal and reconcile system removal
-- NOTE: Tables and columns are kept (data preservation) — only code removed
-- ============================================================================

-- ── Drop estore triggers ──
DROP TRIGGER IF EXISTS on_store_order_cancelled ON store_orders;
DROP TRIGGER IF EXISTS trg_guard_store_order_update ON store_orders;
DROP TRIGGER IF EXISTS trg_guard_store_order_insert ON store_orders;

-- ── Drop estore functions ──
DROP FUNCTION IF EXISTS trigger_release_estore_stock() CASCADE;
DROP FUNCTION IF EXISTS place_estore_order(jsonb) CASCADE;
DROP FUNCTION IF EXISTS store_order_transition_is_valid(text, text) CASCADE;
DROP FUNCTION IF EXISTS guard_store_order_update() CASCADE;
DROP FUNCTION IF EXISTS guard_store_order_insert() CASCADE;

-- ── Drop reconcile functions ──
DROP FUNCTION IF EXISTS reconcile_now() CASCADE;
DROP VIEW IF EXISTS invariant_violations CASCADE;
DROP TABLE IF EXISTS stock_mismatches CASCADE;
