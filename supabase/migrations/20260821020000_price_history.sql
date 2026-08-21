-- ============================================================================
-- 20260821020000_price_history.sql
-- PHASE 11/12 — dedicated price-history log so every product price/cost change
-- is attributable (who changed what, old -> new). Previously price changes were
-- smuggled into stock_history as type='adjustment' (a hack) and the single
-- update path didn't log at all.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.price_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price   numeric,
  new_price   numeric,
  old_cost    numeric,
  new_cost    numeric,
  changed_by  text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON public.price_history(created_at);

-- Offline-first: anon can read/write price history (single-tenant architecture;
-- sensitive actions are otherwise gated by signed action tokens).
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_history_anon ON public.price_history;
CREATE POLICY price_history_anon ON public.price_history FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.price_history TO anon, authenticated, service_role;
