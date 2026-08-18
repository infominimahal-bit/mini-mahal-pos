-- ============================================================================
-- 20260820050000_customer_ledger
-- ----------------------------------------------------------------------------
-- P6/P24: per-customer transaction ledger (running balance) so balances are
-- derived from immutable entries, never direct overwrites. Mirrors SupplierTransaction.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id       uuid,
  type          text NOT NULL,                 -- sale | payment | refund | adjustment | credit | opening
  debit         numeric(12,2) DEFAULT 0,       -- money customer OWES (sale)
  credit        numeric(12,2) DEFAULT 0,       -- money customer PAYS / refunded (payment, refund)
  balance_after numeric(12,2) DEFAULT 0,       -- running balance after this entry
  reference     text,
  note          text,
  created_by    uuid,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON public.customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_sale ON public.customer_ledger(sale_id);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS balance numeric(12,2) DEFAULT 0;

GRANT ALL ON TABLE public.customer_ledger TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.customers TO anon, authenticated, service_role;
