-- DROP legacy users.permissions TEXT[] column (2026-08-23)
-- Legacy tag-based permission system fully removed from code.
-- Authority = role matrix (src/lib/permissions.ts) + server-side signed guards only.
ALTER TABLE public.users DROP COLUMN IF EXISTS permissions;
