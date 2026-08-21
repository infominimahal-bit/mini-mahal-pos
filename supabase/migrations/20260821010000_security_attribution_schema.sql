-- ============================================================================
-- 20260821010000_security_attribution_schema.sql
-- PHASE 39A / 2 / 6 / 27 — schema support for:
--   * users soft-delete (deleted_at) so history/audit survives a "delete"
--   * sale attribution (user_id, original cashier/salesman, action_performed_by,
--     sync_status) for immutable salesman link + multi-device tracing
--   * sessions table for admin session view + per-session revoke
-- ============================================================================

-- 1. users: soft-delete column (block already toggles `active`; delete now also
--    stamps deleted_at but keeps the row so sales/audit history is preserved).
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. sales: attribution + multi-device + sync-status columns.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'synced';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_cashier text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_salesman_id uuid;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_salesman_name text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS action_performed_by text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS edited_from_invoice text;

-- 3. sessions: track active sessions so an admin can list + revoke them, and a
--    block can kill every active session immediately.
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id text,
  login_time timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);

-- RLS: anon can read/write sessions (single-tenant offline-first architecture;
-- role enforcement on sensitive actions is via signed action tokens, not RLS).
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_anon ON public.sessions;
CREATE POLICY sessions_anon ON public.sessions FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.sessions TO anon, authenticated, service_role;

-- Helper: revoke (kill) every active session for a user — used by block/delete
-- and by password change so old sessions cannot linger.
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.sessions SET status = 'revoked', last_activity = now() WHERE user_id = p_user_id AND status = 'active';
END;
$$;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid) TO anon, authenticated, service_role;
