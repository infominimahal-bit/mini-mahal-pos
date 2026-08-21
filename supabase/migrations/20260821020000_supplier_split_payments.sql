-- Phase 4: Supplier Wallet Fix (split payments)
ALTER TABLE supplier_transactions ADD COLUMN IF NOT EXISTS payment_type TEXT;
ALTER TABLE supplier_transactions ADD COLUMN IF NOT EXISTS split_payments JSONB;
