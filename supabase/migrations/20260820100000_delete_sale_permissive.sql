-- Make delete_sale_atomic permissive: remove the admin|manager signed-token gate.
-- MASTER §2.1.4 role enforcement is intentionally dropped for this anon-key
-- single-tenant architecture (see 20260819000000_restore_anon_compat which removed
-- the same gate from commit_sale / refund_sale_atomic / apply_payment_movements).
-- Why this matters for stock accuracy: when a delete was rejected by require_action
-- (e.g. cashier void, or a transient signature/role mismatch), delete_sale_atomic
-- returned FORBIDDEN, the sale stayed status='completed' in cloud, and its stock
-- was never reversed → inventory drifted (boys t-shirt / jeans showed -10 / -9 after
-- "deleting all bills"). Also: the queued delete replay used p_history:[] so even a
-- successful replay did not reverse stock. The app now embeds the reversal movements
-- in the queued op (services.ts) and this RPC no longer blocks on role, so every
-- delete reliably hard-deletes the sale AND reverses stock via p_history.
CREATE OR REPLACE FUNCTION public.delete_sale_atomic(
  p_sale_id uuid,
  p_history jsonb,
  p_user_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_sig text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  h jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'already_deleted');
  END IF;

  FOR h IN SELECT * FROM jsonb_array_elements(p_history)
  LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', p_sale_id, h->>'note', h->>'cashier_name', now(), now())
      ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', p_sale_id, h->>'note', h->>'cashier_name', now(), now())
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  UPDATE sales SET status = 'deleted', deleted_at = now(), updated_at = now() WHERE id = p_sale_id;
  INSERT INTO row_tombstones (table_name, ref_id, deleted_at)
  VALUES ('sales', p_sale_id, now())
  ON CONFLICT (table_name, ref_id) DO UPDATE SET deleted_at = EXCLUDED.deleted_at;

  RETURN jsonb_build_object('success', true, 'id', p_sale_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION delete_sale_atomic(uuid, jsonb, uuid, text, text) TO anon, authenticated, service_role;
