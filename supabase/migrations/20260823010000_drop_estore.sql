-- Migration: permanently remove the e-store (online store) feature and other dead
-- RPCs from the database.
-- Frontend e-store code was already deleted (0 references in src) and the legacy
-- process_sale / process_return RPCs are no longer called by the app (cloud-direct
-- uses commit_sale / refund_sale_atomic). All statements are idempotent.
--
-- NOTE: sales.estore_status and sales.source_order_id columns are intentionally
-- KEPT. commit_sale (the core sale RPC, last redefined in 20260821120000_atomic_sync.sql)
-- still INSERTs these columns, so dropping them would break every sale. They are now
-- harmless dead columns now that the e-store frontend is gone.
--
-- NOTE: the daily_summary view's estore_sales column is intentionally left in place.
-- CREATE OR REPLACE VIEW cannot drop a column when the view has dependents, and the
-- column is a harmless dead computed column. Remove later via DROP VIEW ... CASCADE
-- + recreate if desired.

-- 1. Drop e-store RPCs / functions (CASCADE removes dependent triggers).
DROP FUNCTION IF EXISTS public.place_estore_order(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_release_estore_stock() CASCADE;
DROP FUNCTION IF EXISTS public.store_order_transition_is_valid(old_s text, new_s text) CASCADE;
DROP FUNCTION IF EXISTS public.guard_store_order_update() CASCADE;
DROP FUNCTION IF EXISTS public.guard_store_order_insert() CASCADE;

-- 2. Drop the store_orders table. CASCADE removes its triggers, indexes and FKs
--    (on_store_order_cancelled, update_store_orders_updated_at, guard_stale_write_store_orders,
--     record_tombstone_store_orders, and the sales.source_order_id FK).
DROP TABLE IF EXISTS public.store_orders CASCADE;

-- 3. Drop the legacy (pre-atomic) sale/return RPCs — superseded by commit_sale /
--    refund_sale_atomic. Not referenced by the app or any other function.
DROP FUNCTION IF EXISTS public.process_sale(JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.process_return(UUID, JSONB) CASCADE;
