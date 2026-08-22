-- ════════════════════════════════════════════════════════════════
-- Stage 1 Decommission — Remove vestigial FIFO/lot batch layer
-- ════════════════════════════════════════════════════════════════
-- product_batches was never populated in practice: product.batches was
-- always [] (the frontend mapper stripped batches/product_batches on every
-- read, and no write path ever inserted real lot rows). The FIFO / expiry
-- lot layer is unused dead weight — safe to drop.
--
-- Dependency handled: the LEGACY batch-based audit_stock_integrity()
-- (RETURNS ... batch_sum, LEFT JOIN product_batches) is superseded by the
-- stock_history sum comparison. Its RETURNS-TABLE column differs, so a bare
-- CREATE OR REPLACE would fail — we DROP the function first, recreate it on
-- stock_history, THEN drop the table. Idempotent: if the stock_history
-- version is already live this is a harmless redefinition.
--
-- audit_stock_integrity_history() (added 20260812210000) is unaffected.
-- ════════════════════════════════════════════════════════════════

-- 1. Ensure audit_stock_integrity() does NOT reference product_batches
DROP FUNCTION IF EXISTS audit_stock_integrity() CASCADE;
CREATE OR REPLACE FUNCTION audit_stock_integrity()
RETURNS TABLE(product_id uuid, name text, stock integer, history_sum bigint, diff bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT
    p.id,
    p.name,
    p.stock,
    COALESCE(SUM(sh.change_qty), 0) AS history_sum,
    p.stock::bigint - COALESCE(SUM(sh.change_qty), 0) AS diff
  FROM public.products p
  LEFT JOIN public.stock_history sh ON sh.product_id = p.id
  WHERE p.track_inventory = true
  GROUP BY p.id, p.name, p.stock
  HAVING p.stock != COALESCE(SUM(sh.change_qty), 0)
  ORDER BY ABS(p.stock - COALESCE(SUM(sh.change_qty), 0)) DESC;
$$;
GRANT EXECUTE ON FUNCTION audit_stock_integrity() TO anon, authenticated;

-- 2. Drop the vestigial table. CASCADE removes its FK constraints and RLS policies.
DROP TABLE IF EXISTS product_batches CASCADE;
