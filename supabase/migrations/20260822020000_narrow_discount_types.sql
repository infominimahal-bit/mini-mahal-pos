-- ════════════════════════════════════════════════════════════════════════
-- Migration: Narrow Discount Types (Stage 1 decommission)
-- Date: 2026-08-22
-- ════════════════════════════════════════════════════════════════════════
-- The discount engine now supports only 'percentage' and 'fixed' rules.
-- The promo-style rule types ('bogo', 'free_gift', 'mix_and_match') and their
-- MixAndMatchBuilder UI have been removed from the frontend; the discounts.type
-- CHECK and the orphaned free_gift_products column are narrowed to match.
--
-- NOTE: sales.free_gifts (realized free-gift line items) is intentionally KEPT
--   — it is entangled with sale COGS / stock / return handling and preserves
--   historical sale integrity. This migration only touches the discount RULE
--   definition, not any realized sale data.
--
-- All data is demo/clone data; destructive changes are authorized.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Normalize any legacy rows using a now-removed rule type so the narrowed
--    CHECK constraint can be applied without violation.
UPDATE discounts
   SET type = 'percentage'
 WHERE type NOT IN ('percentage', 'fixed');

-- 2. Narrow the type CHECK constraint to the two supported rule kinds.
ALTER TABLE discounts DROP CONSTRAINT IF EXISTS discounts_type_check;
ALTER TABLE discounts
  ADD CONSTRAINT discounts_type_check CHECK (type IN ('percentage', 'fixed'));

-- 3. Drop the orphaned free-gift rule column (no frontend consumer).
ALTER TABLE discounts DROP COLUMN IF EXISTS free_gift_products;

COMMIT;
