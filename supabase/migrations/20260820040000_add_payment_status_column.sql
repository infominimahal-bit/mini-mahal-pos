-- ============================================================================
-- 20260820040000_add_payment_status_column
-- ----------------------------------------------------------------------------
-- P26/P27: separate PAYMENT_STATUS state machine (paid / partially_paid / unpaid
-- / refunded / partially_refunded / reversed) distinct from sale.status.
-- Set on create/refund/delete from the cloud side (see src/lib/services.ts).
-- ============================================================================

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';
