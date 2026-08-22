-- ════════════════════════════════════════════════════════════════════════
-- Migration: Drop Combo System (Stage 1 decommission)
-- Date: 2026-08-22
-- ════════════════════════════════════════════════════════════════════════
-- The "combo" layer (multi-slot deal builder + scheduling + promo badges +
-- per-bundle extra toppings + highlight tags) is being removed. Simple
-- bundles (a fixed set of products at a bundle discount / override price)
-- remain fully live and untouched.
--
-- KEPT (do NOT drop): bundles, bundle_items, bundles.override_price,
--   bundles.hide_item_prices, bundles.image, bundles.active,
--   bundles.estore_sort_order (e-store scope — separate migration),
--   toppings + product_toppings (independent product-topping feature),
--   products.highlight_tag / products.is_featured (product scope).
--
-- All data is demo/clone data; destructive drops are authorized.
-- DROP TABLE ... CASCADE also removes the tables from the
-- supabase_realtime publication automatically.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Drop the combo slot tables (child-first; CASCADE covers any stragglers).
DROP TABLE IF EXISTS bundle_slot_toppings CASCADE;
DROP TABLE IF EXISTS bundle_slot_options  CASCADE;
DROP TABLE IF EXISTS bundle_slots         CASCADE;

-- 2. Drop the combo-only columns from bundles.
--    (schedule_*, badge_*, extra_toppings, is_combo, deal_category, highlight_tag)
ALTER TABLE bundles
  DROP COLUMN IF EXISTS is_combo,
  DROP COLUMN IF EXISTS deal_category,
  DROP COLUMN IF EXISTS schedule_type,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS repeat_days,
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_time,
  DROP COLUMN IF EXISTS badge_enabled,
  DROP COLUMN IF EXISTS badge_text,
  DROP COLUMN IF EXISTS badge_icon,
  DROP COLUMN IF EXISTS badge_bg_color,
  DROP COLUMN IF EXISTS badge_text_color,
  DROP COLUMN IF EXISTS extra_toppings,
  DROP COLUMN IF EXISTS highlight_tag;

COMMIT;
