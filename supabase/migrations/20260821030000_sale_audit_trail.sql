-- Phase 5: Audit Trail (deviceId + sale_audit_log)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS sale_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID,
  invoice_number TEXT,
  action        TEXT NOT NULL CHECK (action IN (
    'created','edited','deleted','refunded','partially_refunded',
    'discount_changed','payment_changed','item_added','item_removed','price_changed','status_changed'
  )),
  performed_by_id   UUID,
  performed_by_name TEXT,
  performed_by_role TEXT,
  device_id     TEXT,
  note          TEXT,
  meta          JSONB,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sal_sale ON sale_audit_log(sale_id);
CREATE INDEX IF NOT EXISTS idx_sal_time ON sale_audit_log(created_at DESC);
ALTER TABLE sale_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sal_all" ON sale_audit_log FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE sale_audit_log TO anon, authenticated, service_role;
