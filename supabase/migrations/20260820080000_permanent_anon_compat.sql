-- ============================================================================
-- 20260820080000_permanent_anon_compat.sql
-- ============================================================================
-- PERMANENT fix so stock can never break on a fresh clone / the jz project.
-- Mirrors SUPER_MASTER_SCHEMA.sql § ANON-COMPAT GUARANTEE.
--
-- Root cause of the Aug-2026 outage: the hardening narrowed RLS to
-- `authenticated`-only and added auth.uid() checks to commit_sale. This POS ships
-- the PUBLIC anon key and runs offline-login (auth.uid() always NULL), so every
-- sale/stock write was FORBIDDEN -> sales stopped committing, stock stopped
-- decreasing. This migration re-asserts anon-compatible access (idempotent).
-- ============================================================================

-- 1. products: make anon-writable (master schema ships this; re-assert on live)
DROP POLICY IF EXISTS products_write ON public.products;
CREATE POLICY products_write ON public.products FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 2. sales: make anon-writable (select/insert/update)
DROP POLICY IF EXISTS sales_select ON public.sales;
CREATE POLICY sales_select ON public.sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS sales_insert ON public.sales;
CREATE POLICY sales_insert ON public.sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS sales_update ON public.sales;
CREATE POLICY sales_update ON public.sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Permissive *_all policies for every synced non-guard table
--    (OR-combines with existing guards; anon always allowed).
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_all ON public.products;
CREATE POLICY products_all ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_all ON public.sales;
CREATE POLICY sales_all ON public.sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_all ON public.customers;
CREATE POLICY customers_all ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_transactions_all ON public.supplier_transactions;
CREATE POLICY supplier_transactions_all ON public.supplier_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_history_all ON public.stock_history;
CREATE POLICY stock_history_all ON public.stock_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.variant_stock_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS variant_stock_history_all ON public.variant_stock_history;
CREATE POLICY variant_stock_history_all ON public.variant_stock_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.payment_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_movements_all ON public.payment_movements;
CREATE POLICY payment_movements_all ON public.payment_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.payment_modes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_modes_all ON public.payment_modes;
CREATE POLICY payment_modes_all ON public.payment_modes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_batches_all ON public.product_batches;
CREATE POLICY product_batches_all ON public.product_batches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.salesmen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS salesmen_all ON public.salesmen;
CREATE POLICY salesmen_all ON public.salesmen FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.row_tombstones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS row_tombstones_all ON public.row_tombstones;
CREATE POLICY row_tombstones_all ON public.row_tombstones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Broad grants (idempotent). RLS still applies; guard tables stay guarded.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
