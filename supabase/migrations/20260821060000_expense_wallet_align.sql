-- Phase 10: Expense Wallet alignment
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_payment_method_nonempty
  CHECK (payment_method IS NOT NULL AND length(trim(payment_method)) > 0);
