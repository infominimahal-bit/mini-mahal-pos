-- Migration: drop dead offline-era columns/tables
-- These are no longer referenced by any client code or RPC after the
-- offline-first → cloud-direct decommission.
-- All statements are idempotent (IF EXISTS) so the migration is safe to re-run.

-- app_settings.auto_sync: never read/written by the frontend (cloud-direct now).
ALTER TABLE app_settings DROP COLUMN IF EXISTS auto_sync;

-- app_settings.offline_mode: already dropped by 20260822160000_rename_offline_columns.sql.
-- Re-dropped here idempotently so this migration is self-contained.
ALTER TABLE app_settings DROP COLUMN IF EXISTS offline_mode;

-- stock_mismatches: already dropped by 20260820130000_cleanup_estore_reconcile.sql.
-- Re-dropped here idempotently.
DROP TABLE IF EXISTS stock_mismatches CASCADE;
