-- Drop old 7-arg overload (non-idempotent) so only the idempotent 8-arg version remains.
DROP FUNCTION IF EXISTS stock_adjustment(uuid, integer, text, text, text, text, text);

-- Make stock_adjustment idempotent + the single authoritative stock-write path for manual adjustments.
-- (PART O: stock is NEVER edited via products.stock directly; only via stock_history
--  insert which the on_stock_history_insert trigger applies once.)
-- A stable p_adjustment_id lets a retried call become ON CONFLICT DO NOTHING instead of
-- double-counting stock.
CREATE OR REPLACE FUNCTION stock_adjustment(
  p_product_id uuid,
  p_change_qty integer,
  p_type text,
  p_note text,
  p_cashier text,
  p_variant_id text DEFAULT NULL,
  p_variant_label text DEFAULT NULL,
  p_adjustment_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $$
DECLARE
  v_id uuid := COALESCE(p_adjustment_id, gen_random_uuid());
BEGIN
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
$$;
