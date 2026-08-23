-- ============================================================================
-- Migration: Customer Credit/Ledger System
-- Date: 20260823060000
-- Adds:
--   1. allow_credit column on customers
--   2. enableCreditSales + cashierCanCredit on app_settings
--   3. receive_customer_payment RPC (atomic: ledger + balance + payment)
--   4. Trigger: auto-update customers.balance from customer_ledger
-- ============================================================================

-- 1. customers: allow_credit toggle (per customer)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS allow_credit boolean DEFAULT true;

-- 2. app_settings: system-level credit toggles
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS enable_credit_sales boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cashier_can_credit  boolean DEFAULT true;

-- 3. Trigger: auto-update customers.balance when ledger entry inserted
CREATE OR REPLACE FUNCTION fn_sync_customer_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE customers
    SET balance = NEW.balance_after,
        updated_at = now()
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_sync_customer_balance ON customer_ledger;
CREATE TRIGGER trig_sync_customer_balance
  AFTER INSERT ON customer_ledger
  FOR EACH ROW EXECUTE FUNCTION fn_sync_customer_balance();

-- 4. RPC: receive_customer_payment
-- Atomically:
--   a) fetch customer's current balance
--   b) insert customer_ledger entry (type = 'payment_received')
--   c) update customers.balance (trigger handles this)
--   d) insert into payments table for wallet/mode tracking
CREATE OR REPLACE FUNCTION receive_customer_payment(
  p_customer_id    uuid,
  p_amount         numeric,
  p_payment_mode   text     DEFAULT 'cash',
  p_payment_mode_id uuid    DEFAULT NULL,
  p_reference      text     DEFAULT NULL,
  p_note           text     DEFAULT NULL,
  p_created_by     uuid     DEFAULT NULL,
  p_idempotency_key text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_before numeric;
  v_balance_after  numeric;
  v_ledger_id      uuid := gen_random_uuid();
  v_payment_id     uuid := gen_random_uuid();
BEGIN
  -- Idempotency: if key provided, check if already processed
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM customer_ledger
      WHERE reference = p_idempotency_key
        AND customer_id = p_customer_id
        AND type = 'payment_received'
    ) THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true);
    END IF;
  END IF;

  -- Get current balance
  SELECT COALESCE(balance, 0) INTO v_balance_before
  FROM customers WHERE id = p_customer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- New balance (credit reduces balance)
  v_balance_after := v_balance_before - p_amount;

  -- Insert ledger entry (trigger will update customers.balance)
  INSERT INTO customer_ledger (
    id, customer_id, sale_id, type,
    debit, credit, balance_after,
    reference, note, created_by, created_at
  ) VALUES (
    v_ledger_id, p_customer_id, NULL, 'payment_received',
    0, p_amount, v_balance_after,
    COALESCE(p_idempotency_key, p_reference), p_note,
    p_created_by, now()
  );

  -- Insert payment record for mode/wallet tracking
  INSERT INTO payments (
    id, customer_id,
    payment_type, direction,
    amount, note,
    created_at
  ) VALUES (
    v_payment_id, p_customer_id,
    p_payment_mode, 'in',
    p_amount,
    COALESCE(p_note, p_reference),
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'payment_id', v_payment_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION receive_customer_payment TO anon, authenticated;
