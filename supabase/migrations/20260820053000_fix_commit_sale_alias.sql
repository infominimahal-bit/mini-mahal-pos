CREATE OR REPLACE FUNCTION commit_sale(p_sale jsonb, p_history jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  h jsonb;
  cur numeric;
BEGIN
  -- NOTE: NO auth.uid() check. This POS is single-tenant and ships the PUBLIC
  -- anon key; the browser frequently runs WITHOUT a Supabase-auth session
  -- (offline-login fallback), so auth.uid() is effectively always NULL.
  -- Enforcing auth.uid() here broke every clone in Aug-2026 (sales stopped
  -- committing, stock stopped decreasing). Role enforcement lives in the signed
  -- action-token RPCs (delete_sale_atomic / refund_sale_atomic) + the over-refund
  -- cap below — NOT in auth.uid().

  -- Idempotent fulfilment: never bill the same online order twice.
  IF p_sale->>'source_order_id' IS NOT NULL AND p_sale->>'source_order_id' <> '' THEN
    IF EXISTS (SELECT 1 FROM sales WHERE source_order_id = (p_sale->>'source_order_id')::uuid) THEN
      RETURN jsonb_build_object('success', true, 'id', (SELECT id FROM sales WHERE source_order_id = (p_sale->>'source_order_id')::uuid), 'already_fulfilled', true);
    END IF;
  END IF;

  -- MASTER §5.2: client-generated idempotency key -> retry/replay is a no-op.
  IF p_sale->>'idempotency_key' IS NOT NULL AND p_sale->>'idempotency_key' <> '' THEN
    IF EXISTS (SELECT 1 FROM sales WHERE idempotency_key = (p_sale->>'idempotency_key')::uuid) THEN
      RETURN jsonb_build_object('success', true, 'id', (SELECT id FROM sales WHERE idempotency_key = (p_sale->>'idempotency_key')::uuid), 'already_committed', true);
    END IF;
  END IF;

  -- OVERSELL GUARD (P3/P35): never drive product.stock negative unless
  -- app_settings.allow_negative_stock is ON. Variant movements are excluded
  -- (their stock lives in variant_data; variant oversell is guarded client-side).
  DECLARE
    v_allow_neg boolean := false;
    v_oversell int;
  BEGIN
    SELECT COALESCE(allow_negative_stock, false) INTO v_allow_neg FROM app_settings LIMIT 1;
    IF NOT v_allow_neg THEN
      WITH agg AS (
        SELECT (hist_item->>'product_id')::uuid AS pid, SUM((hist_item->>'change_qty')::int) AS delta
        FROM jsonb_array_elements(p_history) hist_item
        WHERE hist_item->>'variant_id' IS NULL OR hist_item->>'variant_id' = ''
        GROUP BY pid
      )
      SELECT 1 INTO v_oversell FROM agg
      JOIN products p ON p.id = agg.pid
      WHERE (p.stock + agg.delta) < 0
      LIMIT 1;
      
      IF FOUND THEN
        RAISE EXCEPTION 'OVERSELL: stock would go negative for a product (allow_negative_stock=false)';
      END IF;
    END IF;
  END;

  INSERT INTO sales (
    id, invoice_number, customer_id, customer_name, customer_phone,
    items, subtotal, discount_amount, bill_discount_value, bill_discount_type,
    tax_amount, total, received_amount, change_amount, payment_method,
    card_details, status, cashier, cashier_role, receipt_number, notes,
    applied_discounts, free_gifts, timestamp, sale_date, sale_type,
    extra_charges, split_payments, refunded_amount, estore_status,
    delivery_address, delivery_fee, delivery_location_lat, delivery_location_lng,
    customer_notes, source_order_id, salesman_id, salesman_name, idempotency_key, created_at, updated_at
  ) VALUES (
    (p_sale->>'id')::uuid,
    p_sale->>'invoice_number',
    NULLIF(p_sale->>'customer_id','')::uuid,
    p_sale->>'customer_name',
    p_sale->>'customer_phone',
    COALESCE(p_sale->'items','[]'::jsonb),
    (p_sale->>'subtotal')::numeric,
    (p_sale->>'discount_amount')::numeric,
    (p_sale->>'bill_discount_value')::numeric,
    p_sale->>'bill_discount_type',
    (p_sale->>'tax_amount')::numeric,
    (p_sale->>'total')::numeric,
    (p_sale->>'received_amount')::numeric,
    (p_sale->>'change_amount')::numeric,
    p_sale->>'payment_method',
    p_sale->'card_details',
    p_sale->>'status',
    p_sale->>'cashier',
    p_sale->>'cashier_role',
    p_sale->>'receipt_number',
    p_sale->>'notes',
    p_sale->'applied_discounts',
    p_sale->'free_gifts',
    (p_sale->>'timestamp')::timestamptz,
    (p_sale->>'sale_date')::date,
    p_sale->>'sale_type',
    p_sale->'extra_charges',
    p_sale->'split_payments',
    (p_sale->>'refunded_amount')::numeric,
    p_sale->>'estore_status',
    p_sale->>'delivery_address',
    (p_sale->>'delivery_fee')::numeric,
    (p_sale->>'delivery_location_lat')::numeric,
    (p_sale->>'delivery_location_lng')::numeric,
    p_sale->>'customer_notes',
    NULLIF(p_sale->>'source_order_id','')::uuid,
    NULLIF(p_sale->>'salesman_id','')::uuid,
    p_sale->>'salesman_name',
    NULLIF(p_sale->>'idempotency_key','')::uuid,
    COALESCE((p_sale->>'created_at')::timestamptz, now()),
    now()
  ) ON CONFLICT (id) DO NOTHING RETURNING id INTO v_id;

  -- Fix latent bug: if the sale id already existed (ON CONFLICT no-op), reuse it
  -- so the stock_history rows below get a valid (non-null) reference_id.
  IF v_id IS NULL THEN
    v_id := (p_sale->>'id')::uuid;
  END IF;

  FOR h IN SELECT * FROM jsonb_array_elements(p_history)
  LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION apply_stock_movements(p_history jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  h jsonb;
BEGIN
  FOR h IN SELECT * FROM jsonb_array_elements(p_history)
  LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', NULLIF(h->>'reference_id','')::uuid, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', NULLIF(h->>'reference_id','')::uuid, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION commit_sale(jsonb, jsonb) TO anon, authenticated, service_role;