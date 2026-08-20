-- PHASE 4: Atomic RPCs for bill-edit + manual stock adjustment.
-- These eliminate the dual-write stock leakage (bill edit used 2 separate calls).

CREATE OR REPLACE FUNCTION edit_sale_atomic(
  p_new_sale jsonb,
  p_new_history jsonb,
  p_old_sale_id uuid,
  p_old_reverse_history jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $$
DECLARE
  v_id uuid;
  h jsonb;
BEGIN
  -- 1. Old sale must exist
  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_old_sale_id) THEN
    RAISE EXCEPTION 'OLD_SALE_NOT_FOUND';
  END IF;

  -- 2. Idempotency check on new sale
  IF p_new_sale->>'idempotency_key' IS NOT NULL AND p_new_sale->>'idempotency_key' <> '' THEN
    IF EXISTS (SELECT 1 FROM sales WHERE idempotency_key = (p_new_sale->>'idempotency_key')::uuid) THEN
      RETURN jsonb_build_object('success', true, 'already_committed', true,
        'new_id', (SELECT id FROM sales WHERE idempotency_key = (p_new_sale->>'idempotency_key')::uuid));
    END IF;
  END IF;

  -- 3. Insert new sale
  INSERT INTO sales (
    id, invoice_number, customer_id, customer_name, customer_phone,
    items, subtotal, discount_amount, bill_discount_value, bill_discount_type,
    tax_amount, total, received_amount, change_amount, payment_method,
    card_details, status, cashier, cashier_role, receipt_number, notes,
    applied_discounts, free_gifts, timestamp, sale_date, sale_type,
    extra_charges, split_payments, refunded_amount, estore_status,
    delivery_address, delivery_fee, delivery_location_lat, delivery_location_lng,
    customer_notes, source_order_id, salesman_id, salesman_name,
    idempotency_key, edited_from_invoice, created_at, updated_at
  ) VALUES (
    (p_new_sale->>'id')::uuid,
    p_new_sale->>'invoice_number',
    NULLIF(p_new_sale->>'customer_id','')::uuid,
    p_new_sale->>'customer_name',
    p_new_sale->>'customer_phone',
    COALESCE(p_new_sale->'items','[]'::jsonb),
    (p_new_sale->>'subtotal')::numeric,
    (p_new_sale->>'discount_amount')::numeric,
    (p_new_sale->>'bill_discount_value')::numeric,
    p_new_sale->>'bill_discount_type',
    (p_new_sale->>'tax_amount')::numeric,
    (p_new_sale->>'total')::numeric,
    (p_new_sale->>'received_amount')::numeric,
    (p_new_sale->>'change_amount')::numeric,
    p_new_sale->>'payment_method',
    p_new_sale->'card_details',
    p_new_sale->>'status',
    p_new_sale->>'cashier',
    p_new_sale->>'cashier_role',
    p_new_sale->>'receipt_number',
    p_new_sale->>'notes',
    p_new_sale->'applied_discounts',
    p_new_sale->'free_gifts',
    (p_new_sale->>'timestamp')::timestamptz,
    (p_new_sale->>'sale_date')::date,
    p_new_sale->>'sale_type',
    p_new_sale->'extra_charges',
    p_new_sale->'split_payments',
    (p_new_sale->>'refunded_amount')::numeric,
    p_new_sale->>'estore_status',
    p_new_sale->>'delivery_address',
    (p_new_sale->>'delivery_fee')::numeric,
    (p_new_sale->>'delivery_location_lat')::numeric,
    (p_new_sale->>'delivery_location_lng')::numeric,
    p_new_sale->>'customer_notes',
    NULLIF(p_new_sale->>'source_order_id','')::uuid,
    NULLIF(p_new_sale->>'salesman_id','')::uuid,
    p_new_sale->>'salesman_name',
    NULLIF(p_new_sale->>'idempotency_key','')::uuid,
    p_new_sale->>'edited_from_invoice',
    COALESCE((p_new_sale->>'created_at')::timestamptz, now()),
    now()
  ) ON CONFLICT (id) DO NOTHING RETURNING id INTO v_id;

  IF v_id IS NULL THEN v_id := (p_new_sale->>'id')::uuid; END IF;

  -- 4. New sale stock movements (deductions -- triggers fire)
  FOR h IN SELECT * FROM jsonb_array_elements(p_new_history) LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  -- 5. Old sale stock reversal (restorations -- triggers fire)
  FOR h IN SELECT * FROM jsonb_array_elements(p_old_reverse_history) LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', p_old_sale_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', p_old_sale_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  -- 6. Hard-delete old sale (tombstone trigger fires automatically)
  DELETE FROM sales WHERE id = p_old_sale_id;

  RETURN jsonb_build_object('success', true, 'new_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION edit_sale_atomic(jsonb, jsonb, uuid, jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION stock_adjustment(
  p_product_id uuid,
  p_change_qty integer,
  p_type text,
  p_note text,
  p_cashier text,
  p_variant_id text DEFAULT NULL,
  p_variant_label text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $$
BEGIN
  IF p_variant_id IS NOT NULL AND p_variant_id <> '' THEN
    INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, note, cashier_name, created_at, updated_at)
    VALUES (gen_random_uuid(), p_product_id, p_variant_id, COALESCE(p_variant_label, ''), p_change_qty, p_type, p_note, p_cashier, now(), now());
  ELSE
    INSERT INTO stock_history (id, product_id, change_qty, type, note, cashier_name, created_at, updated_at)
    VALUES (gen_random_uuid(), p_product_id, p_change_qty, p_type, p_note, p_cashier, now(), now());
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION stock_adjustment(uuid, integer, text, text, text, text, text) TO anon, authenticated, service_role;
