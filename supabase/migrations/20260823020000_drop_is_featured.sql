-- Migration: permanently remove the is_featured (Featured Products) feature.
-- Drops is_featured column from products table.

ALTER TABLE products DROP COLUMN IF EXISTS is_featured;
