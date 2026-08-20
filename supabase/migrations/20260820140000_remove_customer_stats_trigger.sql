-- ============================================================================
-- Remove customer stats trigger to prevent multi-device double-counting.
-- 
-- PROBLEM: Both frontend code (saleCreate.ts) and this DB trigger increment
-- customer.total_purchases on sale creation. On multi-device setups, the 
-- frontend UPSERT from Device A can overwrite Device B's trigger increment,
-- causing stats drift.
--
-- SOLUTION: Frontend is now the SOLE writer of customer.total_purchases.
-- The trigger is dropped. The function is kept for reference.
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_customer_stats ON sales;
