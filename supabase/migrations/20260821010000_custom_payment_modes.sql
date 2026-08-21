-- Phase 1: Custom Wallet Modes
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_payment_method_nonempty
  CHECK (payment_method IS NOT NULL AND length(payment_method) > 0);
ALTER TABLE payment_modes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 99;
ALTER TABLE payment_modes ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
ALTER TABLE payment_modes ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
UPDATE payment_modes SET is_default = TRUE WHERE id IN ('cash','card','online');
GRANT ALL ON TABLE payment_modes TO anon, authenticated, service_role;
GRANT ALL ON TABLE payment_movements TO anon, authenticated, service_role;
