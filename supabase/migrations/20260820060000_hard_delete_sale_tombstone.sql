-- ============================================================================
-- 20260820060000_hard_delete_sale_tombstone
-- ----------------------------------------------------------------------------
-- GAP 2: sale deletion must be a HARD DELETE so the record_tombstone_sales
-- AFTER DELETE trigger writes the row_tombstone (per master guide: deletions
-- use hard deletes + tombstone; never status='deleted'). Removes the manual
-- soft-delete + manual tombstone insert (which left the row physically present).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_sale_atomic(
  p_sale_id uuid,
  p_history jsonb,
  p_user_id uuid DEFAULT NULL::uuid,
  p_role text DEFAULT NULL::text,
  p_sig text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE h jsonb;
BEGIN
  PERFORM public.require_action(p_user_id, p_role, 'delete_sale', p_sig, 'admin', 'manager');
  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id) THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'already_deleted');
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
  -- HARD DELETE: the record_tombstone_sales AFTER DELETE trigger writes the tombstone.
  DELETE FROM sales WHERE id = p_sale_id;
  RETURN jsonb_build_object('success', true, 'id', p_sale_id);
END;
$function$;
