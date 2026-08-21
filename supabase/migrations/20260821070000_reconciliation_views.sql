-- Phase 11: Reconciliation views
CREATE OR REPLACE VIEW stock_drift AS
SELECT p.id, p.name, p.stock AS current_stock,
  COALESCE(SUM(sh.change_qty),0) AS history_sum,
  p.stock - COALESCE(SUM(sh.change_qty),0) AS drift
FROM products p LEFT JOIN stock_history sh ON sh.product_id = p.id
WHERE p.track_inventory = true GROUP BY p.id, p.name, p.stock
HAVING p.stock != COALESCE(SUM(sh.change_qty),0);

CREATE OR REPLACE VIEW wallet_drift AS
SELECT pm.id, pm.name, pm.balance,
  COALESCE(SUM(pmv.delta),0) AS movements_sum,
  pm.balance - COALESCE(SUM(pmv.delta),0) AS drift
FROM payment_modes pm LEFT JOIN payment_movements pmv ON pmv.mode_id = pm.id
GROUP BY pm.id, pm.name, pm.balance
HAVING ABS(pm.balance - COALESCE(SUM(pmv.delta),0)) > 0.01;

CREATE OR REPLACE VIEW over_refunds AS
SELECT id, invoice_number, total, refunded_amount FROM sales
WHERE refunded_amount > total + 0.01;

CREATE OR REPLACE VIEW orphan_sales AS
SELECT s.id, s.invoice_number FROM sales s
INNER JOIN row_tombstones rt ON rt.ref_id = s.id AND rt.table_name = 'sales';

GRANT SELECT ON stock_drift, wallet_drift, over_refunds, orphan_sales TO anon, authenticated, service_role;
