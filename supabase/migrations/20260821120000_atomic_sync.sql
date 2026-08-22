-- Migration: Atomic Project-Wide Sync (Restock, Sales, Expenses)

-- 1. COMMIT RESTOCK
CREATE OR REPLACE FUNCTION commit_restock(
  p_purchase_record jsonb, 
  p_stock_history jsonb DEFAULT '[]'::jsonb, 
  p_supplier_transaction jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  h jsonb;
BEGIN
  INSERT INTO purchase_records (
    id, type, product_id, product_name, sku, variant_id, variant_label,
    quantity, cost_price, retail_price, total_amount, supplier, supplier_id,
    qty_remaining, date, added_by, notes, created_at, updated_at
  ) VALUES (
    (p_purchase_record->>'id')::uuid, p_purchase_record->>'type', NULLIF(p_purchase_record->>'product_id','')::uuid,
    p_purchase_record->>'product_name', p_purchase_record->>'sku', p_purchase_record->>'variant_id',
    p_purchase_record->>'variant_label', (p_purchase_record->>'quantity')::int, (p_purchase_record->>'cost_price')::numeric,
    (p_purchase_record->>'retail_price')::numeric, (p_purchase_record->>'total_amount')::numeric,
    p_purchase_record->>'supplier', NULLIF(p_purchase_record->>'supplier_id','')::uuid,
    (p_purchase_record->>'qty_remaining')::int, COALESCE((p_purchase_record->>'date')::timestamptz, now()),
    p_purchase_record->>'added_by', p_purchase_record->>'notes', COALESCE((p_purchase_record->>'created_at')::timestamptz, now()), now()
  ) ON CONFLICT (id) DO NOTHING RETURNING id INTO v_id;

  IF v_id IS NULL THEN v_id := (p_purchase_record->>'id')::uuid; END IF;

  FOR h IN SELECT * FROM jsonb_array_elements(p_stock_history) LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  IF p_supplier_transaction IS NOT NULL AND jsonb_typeof(p_supplier_transaction) = 'object' THEN
    INSERT INTO supplier_transactions (
      id, supplier_id, type, source_type, amount, reference_id, reference_type,
      note, payment_type, split_payments, created_at, updated_at
    ) VALUES (
      (p_supplier_transaction->>'id')::uuid, (p_supplier_transaction->>'supplier_id')::uuid, p_supplier_transaction->>'type',
      p_supplier_transaction->>'source_type', (p_supplier_transaction->>'amount')::numeric, v_id, p_supplier_transaction->>'reference_type',
      p_supplier_transaction->>'note', p_supplier_transaction->>'payment_type', p_supplier_transaction->'split_payments',
      COALESCE((p_supplier_transaction->>'created_at')::timestamptz, now()), now()
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION commit_restock(jsonb, jsonb, jsonb) TO anon, authenticated, service_role;

-- 2. COMMIT EXPENSE
CREATE OR REPLACE FUNCTION commit_expense(
  p_expense jsonb,
  p_payment_move jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO expenses (
    id, category_id, amount, date, description, added_by, payment_mode, created_at, updated_at
  ) VALUES (
    (p_expense->>'id')::uuid, (p_expense->>'category_id')::uuid, (p_expense->>'amount')::numeric,
    COALESCE((p_expense->>'date')::timestamptz, now()), p_expense->>'description', p_expense->>'added_by',
    p_expense->>'payment_mode', COALESCE((p_expense->>'created_at')::timestamptz, now()), now()
  ) ON CONFLICT (id) DO NOTHING RETURNING id INTO v_id;

  IF v_id IS NULL THEN v_id := (p_expense->>'id')::uuid; END IF;

  IF p_payment_move IS NOT NULL AND jsonb_typeof(p_payment_move) = 'object' THEN
    INSERT INTO payment_movements (id, mode_id, delta, reference_id, note, created_at)
    VALUES (
      COALESCE((p_payment_move->>'id')::uuid, gen_random_uuid()), p_payment_move->>'mode_id',
      (p_payment_move->>'delta')::numeric, v_id, p_payment_move->>'note', now()
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION commit_expense(jsonb, jsonb) TO anon, authenticated, service_role;

-- 3. UPDATED COMMIT SALE (now includes payments and customer ledger)
CREATE OR REPLACE FUNCTION commit_sale(
  p_sale jsonb, 
  p_history jsonb,
  p_payment_moves jsonb DEFAULT '[]'::jsonb,
  p_customer_ledger jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  h jsonb;
  cur numeric;
  v_allow_neg boolean := false;
  v_oversell int;
BEGIN
  IF p_sale->>'source_order_id' IS NOT NULL AND p_sale->>'source_order_id' <> '' THEN
    IF EXISTS (SELECT 1 FROM sales WHERE source_order_id = (p_sale->>'source_order_id')::uuid) THEN
      RETURN jsonb_build_object('success', true, 'id', (SELECT id FROM sales WHERE source_order_id = (p_sale->>'source_order_id')::uuid), 'already_fulfilled', true);
    END IF;
  END IF;

  IF p_sale->>'idempotency_key' IS NOT NULL AND p_sale->>'idempotency_key' <> '' THEN
    IF EXISTS (SELECT 1 FROM sales WHERE idempotency_key = (p_sale->>'idempotency_key')::uuid) THEN
      RETURN jsonb_build_object('success', true, 'id', (SELECT id FROM sales WHERE idempotency_key = (p_sale->>'idempotency_key')::uuid), 'already_committed', true);
    END IF;
  END IF;

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
    (p_sale->>'id')::uuid, p_sale->>'invoice_number', NULLIF(p_sale->>'customer_id','')::uuid,
    p_sale->>'customer_name', p_sale->>'customer_phone', COALESCE(p_sale->'items','[]'::jsonb),
    (p_sale->>'subtotal')::numeric, (p_sale->>'discount_amount')::numeric, (p_sale->>'bill_discount_value')::numeric,
    p_sale->>'bill_discount_type', (p_sale->>'tax_amount')::numeric, (p_sale->>'total')::numeric,
    (p_sale->>'received_amount')::numeric, (p_sale->>'change_amount')::numeric, p_sale->>'payment_method',
    p_sale->'card_details', p_sale->>'status', p_sale->>'cashier', p_sale->>'cashier_role',
    p_sale->>'receipt_number', p_sale->>'notes', p_sale->'applied_discounts', p_sale->'free_gifts',
    (p_sale->>'timestamp')::timestamptz, (p_sale->>'sale_date')::date, p_sale->>'sale_type',
    p_sale->'extra_charges', p_sale->'split_payments', (p_sale->>'refunded_amount')::numeric,
    p_sale->>'estore_status', p_sale->>'delivery_address', (p_sale->>'delivery_fee')::numeric,
    (p_sale->>'delivery_location_lat')::numeric, (p_sale->>'delivery_location_lng')::numeric,
    p_sale->>'customer_notes', NULLIF(p_sale->>'source_order_id','')::uuid, NULLIF(p_sale->>'salesman_id','')::uuid,
    p_sale->>'salesman_name', NULLIF(p_sale->>'idempotency_key','')::uuid,
    COALESCE((p_sale->>'created_at')::timestamptz, now()), now()
  ) ON CONFLICT (id) DO NOTHING RETURNING id INTO v_id;

  IF v_id IS NULL THEN v_id := (p_sale->>'id')::uuid; END IF;

  FOR h IN SELECT * FROM jsonb_array_elements(p_history) LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  -- Payment Moves
  FOR h IN SELECT * FROM jsonb_array_elements(p_payment_moves) LOOP
    INSERT INTO payment_movements (id, mode_id, delta, reference_id, note, created_at)
    VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), h->>'mode_id', (h->>'delta')::numeric, v_id, h->>'note', now()) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- Customer Ledger
  IF p_customer_ledger IS NOT NULL AND jsonb_typeof(p_customer_ledger) = 'object' THEN
    INSERT INTO customer_ledger (id, customer_id, sale_id, type, debit, credit, balance_after, reference, note, created_by, created_at)
    VALUES (
      COALESCE((p_customer_ledger->>'id')::uuid, gen_random_uuid()), (p_customer_ledger->>'customer_id')::uuid, v_id,
      p_customer_ledger->>'type', (p_customer_ledger->>'debit')::numeric, (p_customer_ledger->>'credit')::numeric,
      (p_customer_ledger->>'balance_after')::numeric, p_customer_ledger->>'reference', p_customer_ledger->>'note',
      NULLIF(p_customer_ledger->>'created_by','')::uuid, COALESCE((p_customer_ledger->>'created_at')::timestamptz, now())
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 4. UPDATED DELETE SALE ATOMIC
CREATE OR REPLACE FUNCTION public.delete_sale_atomic(
  p_sale_id uuid,
  p_history jsonb,
  p_user_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_sig text DEFAULT NULL,
  p_payment_moves jsonb DEFAULT '[]'::jsonb,
  p_customer_ledger jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  h jsonb;
BEGIN
  PERFORM public.require_action(p_user_id, p_role, 'delete_sale', p_sig, VARIADIC array['admin', 'manager']);

  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND deleted_at IS NULL) THEN
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

  FOR h IN SELECT * FROM jsonb_array_elements(p_payment_moves) LOOP
    INSERT INTO payment_movements (id, mode_id, delta, reference_id, note, created_at)
    VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), h->>'mode_id', (h->>'delta')::numeric, p_sale_id, h->>'note', now()) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  IF p_customer_ledger IS NOT NULL AND jsonb_typeof(p_customer_ledger) = 'object' THEN
    INSERT INTO customer_ledger (id, customer_id, sale_id, type, debit, credit, balance_after, reference, note, created_by, created_at)
    VALUES (
      COALESCE((p_customer_ledger->>'id')::uuid, gen_random_uuid()), (p_customer_ledger->>'customer_id')::uuid, p_sale_id,
      p_customer_ledger->>'type', (p_customer_ledger->>'debit')::numeric, (p_customer_ledger->>'credit')::numeric,
      (p_customer_ledger->>'balance_after')::numeric, p_customer_ledger->>'reference', p_customer_ledger->>'note',
      NULLIF(p_customer_ledger->>'created_by','')::uuid, COALESCE((p_customer_ledger->>'created_at')::timestamptz, now())
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  UPDATE sales SET status = 'deleted', deleted_at = now(), updated_at = now() WHERE id = p_sale_id;
  INSERT INTO row_tombstones (table_name, ref_id, deleted_at) VALUES ('sales', p_sale_id, now()) ON CONFLICT (table_name, ref_id) DO UPDATE SET deleted_at = EXCLUDED.deleted_at;

  RETURN jsonb_build_object('success', true, 'id', p_sale_id);
END;
$function$;

-- 5. UPDATED REFUND SALE ATOMIC
CREATE OR REPLACE FUNCTION public.refund_sale_atomic(
  p_sale_id uuid,
  p_history jsonb,
  p_status text,
  p_refunded_amount numeric,
  p_user_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_sig text DEFAULT NULL,
  p_payment_moves jsonb DEFAULT '[]'::jsonb,
  p_customer_ledger jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  h jsonb;
  _total numeric;
BEGIN
  PERFORM public.require_action(p_user_id, p_role, 'refund_sale', p_sig, VARIADIC array['admin', 'manager', 'cashier']);

  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id) THEN
    RETURN jsonb_build_object('success', true, 'id', p_sale_id, 'note', 'sale_missing');
  END IF;
  SELECT total INTO _total FROM sales WHERE id = p_sale_id;
  IF _total IS NOT NULL AND p_refunded_amount > _total + 0.001 THEN
    RAISE EXCEPTION 'FORBIDDEN: refund amount exceeds sale total' USING ERRCODE = '42501';
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

  FOR h IN SELECT * FROM jsonb_array_elements(p_payment_moves) LOOP
    INSERT INTO payment_movements (id, mode_id, delta, reference_id, note, created_at)
    VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), h->>'mode_id', (h->>'delta')::numeric, p_sale_id, h->>'note', now()) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  IF p_customer_ledger IS NOT NULL AND jsonb_typeof(p_customer_ledger) = 'object' THEN
    INSERT INTO customer_ledger (id, customer_id, sale_id, type, debit, credit, balance_after, reference, note, created_by, created_at)
    VALUES (
      COALESCE((p_customer_ledger->>'id')::uuid, gen_random_uuid()), (p_customer_ledger->>'customer_id')::uuid, p_sale_id,
      p_customer_ledger->>'type', (p_customer_ledger->>'debit')::numeric, (p_customer_ledger->>'credit')::numeric,
      (p_customer_ledger->>'balance_after')::numeric, p_customer_ledger->>'reference', p_customer_ledger->>'note',
      NULLIF(p_customer_ledger->>'created_by','')::uuid, COALESCE((p_customer_ledger->>'created_at')::timestamptz, now())
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  UPDATE sales SET status = p_status, refunded_amount = p_refunded_amount, updated_at = now() WHERE id = p_sale_id;
  RETURN jsonb_build_object('success', true, 'id', p_sale_id);
END;
$function$;
