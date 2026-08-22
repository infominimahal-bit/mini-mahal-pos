-- ============================================================================
-- Migration: Drop E-store config columns (Stage 1 decommission, pure orphans)
-- Date: 2026-08-22
-- ============================================================================
-- CONTEXT
--   The e-store frontend has been fully removed. Cloud is being simplified to a
--   POS-only single source of truth. This migration drops the config/catalog
--   columns that the e-store used and that NOTHING in the POS reads or writes.
--
-- SAFETY (verified before authoring)
--   * No RPC / function / trigger body references any of these columns.
--     (The only app_settings read inside functions is `allow_negative_stock`.)
--   * No index or view references these columns.
--   * The POS settings mappers/types/form no longer read or write them.
--   Every statement is DROP COLUMN IF EXISTS -> idempotent and safe to re-run.
--
-- DEFERRED to Stage 2 (financial-RPC entangled, NOT touched here)
--   * store_orders table + its triggers/guards + place_estore_order()
--     + trigger_release_estore_stock() + anon INSERT grant
--   * sales.source_order_id (FK to store_orders) and sales.estore_status
--   * sale_type CHECK 'estore' / expenses.store_type CHECK 'estore'
--   * daily_summary.estore_sales
--   These are dropped when commit_sale / edit_sale / atomic_sync are rewritten.
-- ============================================================================

BEGIN;

-- ---- app_settings: e-store storefront + geo + fulfillment-window config -----
ALTER TABLE app_settings
  DROP COLUMN IF EXISTS estore_enabled,
  DROP COLUMN IF EXISTS estore_theme_color,
  DROP COLUMN IF EXISTS estore_delivery_fee,
  DROP COLUMN IF EXISTS estore_min_order,
  DROP COLUMN IF EXISTS estore_cod_enabled,
  DROP COLUMN IF EXISTS estore_location_lat,
  DROP COLUMN IF EXISTS estore_location_lng,
  DROP COLUMN IF EXISTS estore_delivery_radius,
  DROP COLUMN IF EXISTS estore_whatsapp_enabled,
  DROP COLUMN IF EXISTS estore_whatsapp_number,
  DROP COLUMN IF EXISTS estore_primary_color_hover,
  DROP COLUMN IF EXISTS estore_bg_color,
  DROP COLUMN IF EXISTS estore_text_color,
  DROP COLUMN IF EXISTS estore_card_bg_color,
  DROP COLUMN IF EXISTS estore_order_timer_enabled,
  DROP COLUMN IF EXISTS estore_order_timer_minutes,
  DROP COLUMN IF EXISTS estore_custom_payment_enabled,
  DROP COLUMN IF EXISTS estore_custom_payment_name,
  DROP COLUMN IF EXISTS estore_custom_payment_detail,
  DROP COLUMN IF EXISTS estore_custom_payment_note,
  DROP COLUMN IF EXISTS estore_pickup_enabled,
  DROP COLUMN IF EXISTS estore_delivery_enabled,
  DROP COLUMN IF EXISTS store_type,
  DROP COLUMN IF EXISTS store_latitude,
  DROP COLUMN IF EXISTS store_longitude,
  DROP COLUMN IF EXISTS shop_open_time,
  DROP COLUMN IF EXISTS shop_close_time,
  DROP COLUMN IF EXISTS delivery_start_time,
  DROP COLUMN IF EXISTS delivery_end_time,
  DROP COLUMN IF EXISTS pickup_start_time,
  DROP COLUMN IF EXISTS pickup_end_time;

-- ---- products: e-store catalog visibility + sort ---------------------------
ALTER TABLE products
  DROP COLUMN IF EXISTS show_in_estore,
  DROP COLUMN IF EXISTS estore_sort_order,
  DROP COLUMN IF EXISTS estore_category_sort_order;

-- ---- categories: e-store sort ----------------------------------------------
ALTER TABLE categories
  DROP COLUMN IF EXISTS estore_sort_order;

-- ---- bundles: e-store sort -------------------------------------------------
ALTER TABLE bundles
  DROP COLUMN IF EXISTS estore_sort_order;

COMMIT;
