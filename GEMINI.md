# 🏗️ Zaynahs POS — MASTER RULES (ALL FIXES MERGED)
> Every known bug is addressed here permanently. Yeh file AI agents ke liye single source of truth hai.

> ⚡ **Supabase Management API Only** — All database operations MUST use the `sbp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` token + curl/API. 
> Prisma and direct DB connections have been completely removed. See [@docs/supabase-api-guide.md](docs/supabase-api-guide.md) for complete API reference.

---

## 🚀 MANDATORY PROJECT PUSH RULE (MANDATORY)

# 📝 TASK MANAGEMENT RULE (MANDATORY)

For every large or multi-step task, you MUST create a `todo.md` file in the project root (ya agent ka built-in todo tracker use karo — opencode `todowrite` tool) to plan and track your progress.
1. Break down the task into clear, actionable steps.
2. Check off items as you complete them.
3. This ensures you do not forget pending items and allows you to work faster without repeatedly scanning or reading the same files.


- **Push Everywhere:** Whenever you make ANY code change, bug fix, or schema update, you MUST ALWAYS push the updated code to ALL active clone projects immediately.
- **Command:** `git push origin main` (har active clone ka apna repo/remote — current list: `zaynahspos v2` single project)
- **Never Skip:** Never assume a fix is just for one project. Code updates must be synced globally so all clones stay 100% identical.



## 🌍 UNIVERSAL REUSABILITY RULE (MANDATORY)

- **Code is Universal:** This system is designed for **multiple clones/shops**. NEVER fix a bug, UI issue, or add a feature in a "shop-specific" or "one-off" way.
- **Global Code Changes:** ALL fixes (whether it's CSS, layout, logic, or bug fixes) MUST be implemented in the core codebase (`src/`, `index.css`, `shared/`) so that the exact same code runs universally across all current and future clones.
- **Future-Proofing:** Every time you write code, ask yourself: *"Will this work seamlessly on the next new clone without any manual changes?"* If the answer is no, your code is wrong.

## 🧩 SHARED MODULES UNIVERSAL RULE (MANDATORY — ANTI-AI-BREAKABLE)

**THE SYSTEM IS ONE SHARED DESIGN LANGUAGE. NO DUPLICATES. NO VARIANTS. NOWHERE.**

- **Single Source of Truth:** Har cheez EK hi shared module se aati hai — `src/shared/ui/` (Button, Card, Badge, Modal, Dialog, BottomSheet, Select, DateRangePicker, Pagination, EmptyState, ToggleSwitch, SegmentedControl, Avatar, LoadMoreButton) aur `src/shared/modules/search-and-list/` (SharedSearchBar, SharedProductList, useDragDropList).
- **Icons:** Ek hi icon set (Lucide) sab jagah — har page/component me alag alag icon pack/emoji ban. Icons sirf shared wrappers se import.
- **Buttons:** `.btn-md` default — sab buttons shared `Button` se. Page-local button styling BANNED.
- **Modals & Popups:** Sab modals/dialogs/popups shared `Dialog`/`ModernModal`/`BottomSheet` se. Form modals `maxWidth="lg"|"xl"` + `md:grid-cols-2`. Alag-alag popup implementations BANNED. Mobile pe center (`items-center justify-center`) — bottom sheets never.
- **Media Selection:** ALL image upload/selection (products, deals, settings, logo) MUST route through centralized `MediaLibrary` — direct file-picker triggers BANNED. Compression (WebP 20-50KB) via shared `compressImage` (src/shared/imageCompression.ts).
- **Drag & Reorder:** Sorted/drag lists shared `useDragDropList` + `DragHandle` se — page-local reorder logic BANNED.
- **Loaders:** Primary loaders sirf `<SkeletonLoader />` — generic spinners BANNED for primary loads.
- **Business Logic:** Ek hi shared helper (`commitStockInToInventory` = ONLY stock-in path). Parallel implementations BANNED (AGENTS.md rule 18).
- **POS Exemption ONLY:** `src/components/pos/**` is the ONLY folder exempt from shared UI (fast dense UI), BUT logic/rules F1-F23 still apply. Estore uses shared wrappers with `!`-prefixed className theme overrides only.
- **Verification:** New page banane se pehle docs/MODULES.md registry check karo — agar module exist karta hai, use karo; naya same-purpose module banane se pehle register aur justify karo.
- **Failure = Rule Violation:** Koi bhi page jo shared module ko copy-paste karke alag version banaye, usse REJECT karo aur shared se replace karo.

## 🧩 FEATURE PLAN — POS PRODUCT SORT (STORE SORT MIRROR)

**Goal:** POS product grid pe bhi wahi drag up/down sort system chahiye jo `STORE SORT` (`/inventory/store-sort`) mein hai — cashier apni POS grid me products arrange kar sake.

**MANDATORY design (anti-AI-breakable):**
1. **Shared module ONLY:** Sort UI `useDragDropList` + `DragHandle` (src/shared/modules/search-and-list) se banega. STORE SORT ka same look/feel. Custom drag logic BANNED.
2. **Trigger:** POS header me `Sort` button (Grid Density controller ke paas) → Sort Mode on. Ya product card pe grip icon jo sirf Sort Mode me visible ho.
3. **Persistence:** Order `app_settings` JSON field `pos_product_order` me save (structure: `{ [categoryId|'all']: string[] /* product IDs */ }`) — bilkul STORE SORT ki tarah. No new table needed.
4. **Scope:** Per-category ordering (har category apni order). Category switch par respective order apply.
5. **Sync:** Local-first → Dexie `appSettings` + `queueOp('app_settings','update')` + `dispatch SET_SETTINGS` (settings singleton pattern follow karo).
6. **Reset:** "Reset to Default" button (clears `pos_product_order` for that category).
7. **Behavior:** Drag → order change → save → grid turant reflect → Sort Mode exit par normal grid.

**Implementation checklist (jab src available ho):**
- [ ] `AppSettings` interface me `posProductOrder?: Record<string, string[]>` add (types/index.ts)
- [ ] `mapSettings`/`toRemoteSettings` me map
- [ ] `SUPER_MASTER_SCHEMA.sql` app_settings ALTER TABLE add (`pos_product_order JSONB DEFAULT '{}'::jsonb`)
- [ ] POS header `Sort` toggle + `useDragDropList` wire
- [ ] ProductGrid reads `pos_product_order[category]` for display order
- [ ] MODULES.md / UI_RULES.md update

> NOTE: Yeh folder me `src/` nahi hai — rule + plan yahan documented hai; actual code tab likhega jab real project folder dikhayein.

# ⛔ RULE #0 — ABSOLUTE PRIME DIRECTIVE
## 🏢 Business Scope & Safety Rules
- **Applies to:** Universal Business System (Clothing, Pharmacy, Restaurant, Retail, Electronics, Mobile, Tech, Shoes, Grocery). NO logic or layout may be hardcoded to a specific niche.
- **Enforced Terminology:** `item` / `product` / `unit` / `category` / `listing` / `variant` / `modifier` / `addon`.
- **Electronics / Tech Tracking:** The system fully supports Serial Number and IMEI tracking via `requireSerial` and `serialNumber` fields. Never assume the POS is only for food or basic retail.


1. **Fulfill the Request**: Modify, refactor, or create exactly what the user asks without hesitation.
2. **Design Parity**: Maintain "Expert Density" aesthetic and established design patterns.
3. **Direct Action**: Find the relevant files and implement the fix directly.
4. **DATA INTEGRITY FIRST**: Financial and stock data is NEVER approximated. If uncertain → throw error, never silently fallback to 0.
5. **🎨 UI TASKS (MANDATORY)**: Before touching ANY UI/UX code (styling, components, layouts, responsiveness, animations), YOU MUST READ [docs/UI_RULES.md](docs/UI_RULES.md) AND [docs/MODULES.md](docs/MODULES.md) FIRST. Failure to do so is a violation of the Prime Directive. UI primitives, search/list/drag modules, and shared business logic MUST come from the shared modules — **always the SAME module everywhere, never page-local variants.**
6. **📏 SIZING RULE (MANDATORY)**: For all new pages and components, Modals MUST use `maxWidth="lg"` or `"xl"` (never sm or md for forms) with a 2-column grid (`md:grid-cols-2`), and ALL buttons MUST include `.btn-md` by default unless specifically overriding.
7. **📱 MOBILE MODAL RULE (MANDATORY)**: All Modals, Popups, and Drawers (including Cart) MUST be displayed in the center of the screen on mobile devices (`items-center justify-center`). NEVER use bottom sheets (`items-end` or `justify-end`) for modals.
8. **STRICT DATABASE POLICY (NO PRISMA)**: Direct DB connections, Postgres connection strings (`DATABASE_URL`, `DIRECT_URL`), and Prisma ORM are completely banned. You must strictly use the Supabase Management API via HTTP/curl for all database schema and data control. Refer to [@docs/supabase-api-guide.md](docs/supabase-api-guide.md) for the exact API specifications.
9. **📄 DOCS MUST STAY CURRENT (MANDATORY)**: Every time you change the database schema (columns, tables, indexes, functions) or add a new feature that affects setup/configuration, you MUST:
   - Update `supabase/schema/SUPER_MASTER_SCHEMA.sql` (both CREATE TABLE + ALTER TABLE ADD COLUMN IF NOT EXISTS blocks)
   - Update `docs/setup.md` (add column to post-launch table, update checklist if applicable)
   - Failure to keep both in sync is a violation.
10. **💀 SKELETON LOADING RULE (MANDATORY)**: All loading states for main layout switches, routes, or grid views (storefront, product grid, list pages) MUST use the centralized `<SkeletonLoader />` component (`src/shared/ui/SkeletonLoader.tsx`) to provide a premium, smooth shimmer load experience. Generic spinner loaders are strictly prohibited for primary loaders.
11. **📚 DOCS STAY CURRENT RULE (MANDATORY)**: `docs/MODULES.md` (shared module registry) and `docs/UI_RULES.md` (design rules) are the live source of truth — **always kept up to date**. Whenever you create a new shared module/component/helper, change a shared module's API, or change any UI rule/pattern, you MUST update BOTH docs in the SAME change — a stale registry is a violation. All new shared modules go under `src/shared/**` with barrel export; parallel/duplicate implementations of shared business logic are BANNED — always import the existing shared one (e.g. `commitStockInToInventory` from `src/lib/stockInCommit.ts` is the ONLY stock-in path).
12. **🛡️ ANTI-AI BREAKABLE UI RULE (STRICT MANDATE)**: You MUST use existing shared modules (`src/shared/*`) for EVERYTHING. NEVER build separate, page-specific or one-off versions of buttons, icons, popups, media selection libraries, drag-and-drop lists, or search bars. If a popup, button, or icon is used in one place, it MUST be exactly the same (using the shared component) in all other places. Always reuse the shared library of modules. This ensures modern consistency across the entire app and prevents AI from hallucinating custom, broken UI components.

---

# 🔴 FINANCIAL INTEGRITY RULES (NEW — HIGHEST PRIORITY)

## RULE F1 — DUPLICATE PRODUCT PREVENTION (PERMANENT FIX)

**NEVER create a product without checking for existing name first.**

Before ANY `productsService.create()` call, you MUST check:
```typescript
const { data: existing } = await supabase
  .from('products')
  .select('id, stock')
  .ilike('name', productData.name.trim())
  .maybeSingle();

if (existing) {
  throw new Error(`Product "${productData.name}" already exists (ID: ${existing.id}). Use stock update instead of creating duplicate.`);
}
```

**DB Level constraint** — this migration MUST exist in SUPER_MASTER_SCHEMA.sql:
```sql
-- Prevent duplicate product names at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_unique 
ON products (LOWER(TRIM(name)));
```

If you see `ERROR: duplicate key value violates unique constraint` → this is WORKING CORRECTLY. Show user a proper error message, do not bypass.

---

## RULE F2 — STOCK HISTORY IS MANDATORY (NEVER SKIP)

Every single stock change MUST write to `stock_history`. No exceptions ever.

| Event | type value | changeQty sign |
|-------|-----------|---------------|
| Product created with stock > 0 | `initial` | positive |
| Purchase record added | `stock_in` | positive |
| Sale created | `sale` | negative |
| Sale deleted or returned | `return` | positive |
| Manual adjustment up | `adjustment` | positive |
| Manual adjustment down | `adjustment` | negative |
| Supplier return | `adjustment_out` | negative |

**If you write code that changes `products.stock` WITHOUT writing to `stock_history` → that code is WRONG. Fix it immediately.**

Correct pattern:
```typescript
// Step 1: Update product stock
await supabase.from('products').update({ stock: newStock }).eq('id', productId);

// Step 2: ALWAYS log to stock_history (never skip this)
await supabase.from('stock_history').insert({
  product_id: productId,
  change_qty: changeAmount,   // positive or negative
  balance_after: newStock,
  type: 'sale',               // use correct type from table above
  reference_id: saleId,       // link to source record
  created_at: new Date().toISOString()
});
```

---

## RULE F4 — BILL EDIT MUST BE ATOMIC (create-first + rollback — see F10)

Bill edit = create new sale + delete old sale. These are TWO operations that must behave as ONE.

**The ONLY correct pattern is F10 (create-first, delete-second + rollback). F4's old "delete-first" pattern is BANNED** — if delete succeeds but create fails, stock gets over-inflated and revenue disappears.

> ⚠️ NOTE: Purana F4 delete-first pattern REMOVED (2026-08-16). Sirf F10 pattern valid hai. Yeh rule ab F10 ka reference hai, apna code block nahi.

Required pattern — **F10 (create-first + rollback)**:
```typescript
// CORRECT: Phase 1 create new sale, Phase 2 delete old, failure → rollback Phase 1
try {
  const savedSale = await salesService.create(newSaleData);
  await salesService.delete(oldSaleId);
  return savedSale;
} catch (deleteError) {
  // Rollback the new sale's stock
  try {
    await salesService.delete(savedSale.id, profile?.name || 'Admin');
  } catch (rollbackError) {
    console.error('Failed to rollback new sale stock after edit failure:', rollbackError);
  }
  throw deleteError;
}
```

---

## RULE F5 — PURCHASE COST MUST NEVER BE ZERO SILENTLY

When calculating COGS/profit, the priority chain is:
1. `item.purchaseCost` (FIFO-calculated at sale time) ← BEST
2. `item.product.cost × qty` (current product cost) ← FALLBACK, flag it
3. STOP — never use 0, throw a warning

```typescript
// CORRECT pattern in ReportsManager.tsx
const getCOGS = (item: SaleItem): { cost: number; estimated: boolean } => {
  if (item.purchaseCost && item.purchaseCost > 0) {
    return { cost: item.purchaseCost, estimated: false };
  }
  if (item.product?.cost && item.product.cost > 0) {
    console.warn(`[COGS] Using current product cost for item ${item.productId} — FIFO cost missing`);
    return { cost: item.product.cost * item.quantity, estimated: true };
  }
  // NEVER return 0 silently
  console.error(`[COGS] No cost available for item ${item.productId} — profit will be wrong`);
  return { cost: 0, estimated: true };
};

// In report display: if estimated=true, show ⚠️ next to profit figure
```

---

## RULE F6 — REPORTS MUST QUERY DB DIRECTLY (NOT IN-MEMORY)

**NEVER calculate reports from in-memory `state.sales` array.**

The in-memory state is capped at 1000 records for performance. Using it for reports means any store with 1000+ sales gets wrong monthly/annual totals — silently.

```typescript
// WRONG — uses memory cap
const revenue = state.sales
  .filter(s => isInRange(s.createdAt, startDate, endDate))
  .reduce((sum, s) => sum + s.total, 0);

// CORRECT — queries Supabase directly with date filter
const { data: salesData } = await supabase
  .from('sales')
  .select('total, items, created_at, status')
  .gte('created_at', startDate.toISOString())
  .lte('created_at', endDate.toISOString())
  .neq('status', 'refunded');

const revenue = salesData?.reduce((sum, s) => sum + s.total, 0) ?? 0;
```

---

---

## RULE F7 — SINGLE TENANT ARCHITECTURE
This is a 1 Clone = 1 Shop system. workspace_id and shift_id do NOT exist and should never be used.
**Shift System: PERMANENTLY REMOVED (2026-08-12).** No shift tables/columns/functions anywhere — in code, localDb, or any project DB. Never reintroduce a shift system; tampering will corrupt reports.

## RULE F8 — STOCK AUDIT FUNCTION (ADD TO SERVICES.TS)

This function must exist in `services.ts` and be callable from admin panel:

```typescript
export const auditStockIntegrity = async (): Promise<{
  corrupt: Array<{ name: string; stock: number; batchSum: number; diff: number }>;
  clean: number;
}> => {
  const { data } = await supabase.rpc('audit_stock_integrity');
  // RPC returns products where stock != sum of batch qty_remaining
  return data;
};
```

---

## RULE F10 — BILL EDIT ROLLBACK ON FAILURE (PERMANENT)

Bill edit uses create-first, delete-second pattern. Both CheckoutModal.tsx AND CheckoutPage.tsx MUST:

1. **Phase 1**: Create new sale (deducts stock)
2. **Phase 2**: Delete old sale (restores stock)
3. **If Phase 2 fails**: MUST rollback Phase 1 by calling `salesService.delete(savedSale.id)` to restore the new sale's stock deduction

**If Phase 2 fails and you DON'T rollback Phase 1 → stock is double-deducted. This is a CRITICAL financial bug.**

```typescript
// CORRECT: Both CheckoutModal.tsx AND CheckoutPage.tsx must have this:
} catch (deleteError) {
  // Rollback the new sale's stock
  try {
    await salesService.delete(savedSale.id, profile?.name || 'Admin');
  } catch (rollbackError) {
    console.error('Failed to rollback new sale stock after edit failure:', rollbackError);
  }
  // Then mark old sale as void + show error
}
```

---

## RULE F11 — RECONCILE TOOL + STOCK ACCURACY (PERMANENT)

### Reconcile tool MUST exist
The `reconcileAllStock()` function in `services.ts` and the "Reconcile" button in
`InventoryManager.tsx` toolbar MUST always exist. They are the **MANUAL** safety net for
detecting/fixing stock ledger drift (theft, damage, physical count gap, sync error).
- **Function**: `reconcileAllStock(autoFix?: boolean)` in `services.ts`
- **UI**: Purple "Reconcile" button with Shield icon in inventory toolbar (admin only). The **Reconciliation Dashboard** (mismatch log + "Run Reconciliation") lives under **Settings › Backup & Restore** (moved out of Inventory).
- **Behavior**: scans all products, compares `products.stock` vs `stock_history` ledger
  total, reports mismatches, optionally auto-fixes with a corrective history entry.

### AUTO-BACKGROUND RECONCILE IS PROHIBITED (PERMANENT)
`reconcileAllStock(true)` (or any auto-fix) MUST NEVER be called automatically (boot,
sync, interval). It reads a ledger snapshot that can lag a just-made sale, so it slams
`products.stock` back to the pre-sale value — erasing legitimate sale/delete movements.
Stock is kept accurate **per-transaction** by the `on_stock_history_insert` /
`on_variant_stock_history_insert` triggers (append-only ledger = single source of truth).
Reconcile is **MANUAL-only**.

### STOCK ACCURACY + ANON RLS (PERMANENT — this broke every clone in Aug-2026)
- Stock accuracy = the `stock_history` ledger triggers. NO code path sends absolute
  `products.stock`; the trigger derives it.
- This POS is single-tenant and ships the PUBLIC **anon key**; the browser frequently
  runs WITHOUT a Supabase-auth session (offline-login), so `auth.uid()` is always NULL.
- Therefore RLS MUST be anon-compatible: every synced table needs a permissive
  `USING (true) WITH CHECK (true)` policy (or a signed `verify_table_write` guard for
  app_settings/expenses/suppliers). `commit_sale` MUST NOT contain an `auth.uid()`
  check — enforcing it broke every clone (sales stopped committing, stock stopped
  decreasing). See `SUPER_MASTER_SCHEMA.sql` § ANON-COMPAT GUARANTEE.
- Role enforcement is via signed action-token RPCs (`delete_sale_atomic`,
  `refund_sale_atomic`) + the over-refund cap — NOT `auth.uid()`.

**Never remove the reconcile tool, never auto-run it, never add auth.uid() checks.**

---

## RULE F12 — SINGLE-REVERSAL RULE (PERMANENT)

Every stock reversal happens EXACTLY ONCE, inside the owning service. UI handlers must NEVER reverse stock again after calling the service.

- **Owning services**: `salesService.delete`, `returnSale`, `purchaseRecordsService.delete`
- **Rule**: Deleting ANY purchase record (Stock IN / Adjustment — signed quantity) reverses its ledger effect with exactly ONE `adjustment_out` history entry inside `purchaseRecordsService.delete`.
- **Violation history**: PurchaseHistory double-reversal caused -2×Q on cloud (`2026-08-12` audit C1).

## RULE F13 — DRAFT RULE (PERMANENT)

Drafts (`status:'pending'` / `DRAFT_SALE` note) are saved CARTS, not revenue.

- NEVER deduct/restore stock for drafts
- NEVER touch customer stats (creditUsed, totalPurchases)
- NEVER appear in `getReportSales`/`getReportRefunds` (`.neq('status','pending')`)
- Guards live in `salesService.create` (`skipStockEffects`) + `salesService.delete` (`!isDraftSale`)
- UI: `POSTerminal.saveDraft` saves with `status:'pending'` (never `completed`)

## RULE F14 — NEVER TRUNCATE FINANCIAL DATA (PERMANENT)

- NO `.limit()` or `.slice(0, N)` on sales/expenses/payments/refunds for totals or reports — use `fetchAllPages()`.
- `state.sales` must hold ALL sales (list views paginate themselves).
- Violation history: 1000-sale slice corrupted dashboard/transactions totals; 200/5000 caps on report+search queries.

## RULE F15 — PARTIAL-REFUND DEDUPE (PERMANENT)

`partially_refunded` sales appear in BOTH `getReportSales` AND `getReportRefunds` → merging with `[...sales, ...refunds]` subtracts refundedAmount TWICE.

- Merge by sale id — reportSales copy wins, refunds only add NEW ids.

## RULE F16 — WALLET COLLECTIONS EXCLUDE REFUND PAYOUTS (PERMANENT)

- Refund payouts are `direction:'out'` — collections/totals MUST exclude them (`p.direction !== 'out'`).
- Wallet totals MUST subtract refunded sales (full = full method share, partial = prorated for split) everywhere (ReportsManager + TransactionsManager together).

## RULE F17 — QUEUE MERGE RULES (localDb.queueOp) (PERMANENT)

- A queued `delete` MUST survive later update/upsert attempts (delete wins — never resurrect financial records).
- Merging MUST reset `retries: 0` + `status:'pending'` — no zombie ops that fail both the retry filter and error-recovery filter.

## RULE F18 — REALTIME CONFLICT GUARDS (PERMANENT)

- Sales UPDATE events must skip rows with a pending local change / isPendingDelete — remote value is older than local intent.
- Realtime `stock_history` rows must be `mapStockHistory`-mapped — raw snake_case rows break report readers and the 90-day/5000-cap prune.

## RULE F19 — FETCH FAILURE NEVER WIPES CACHE (PERMANENT)

`.catch(() => [])` on a leading merge source = local cache wipe (payments ledger). On failure, merge from the CURRENT local rows (identity no-op).

## RULE F20 — NO SILENT FINANCIAL OP DROPS (PERMANENT)

- Type/constraint errors (`22P02`/`22003`/`23514`) mark ops `error` for owner review — NEVER hard-delete financial ops from the queue.
- Duplicate-key drops only for `sales` create (invoice collision RPC path).
- Sync timeout must NOT release `_isSyncing` mid-batch (avoids double execution).

## RULE F21 — STALE-WRITE GUARD (PERMANENT — cross-device conflict endgame)

- **Problem:** Device A cancels/deletes a record; Device B's stale bill-edit syncs later with `.upsert()` → the deleted record RESURRECTS (was last-write-wins).
- **Server-enforced solution (DB):**
  - `row_tombstones(table_name, ref_id, deleted_at)` registry + `record_row_tombstone()` AFTER DELETE trigger on financial tables: `sales`, `stock_history`, `variant_stock_history`, `purchase_records`, `expenses`, `payments`, `store_orders`, `sales_tabs`.
  - `guard_stale_write()` BEFORE INSERT OR UPDATE trigger on the same tables raises `STALE_WRITE` (`ERRCODE P0007`) when: (a) ANY write targets a tombstoned id (delete wins — F17 now DB-enforced across devices, a deleted row can NEVER come back), or (b) `NEW.updated_at < OLD.updated_at` (newest-wins; remote is authoritative).
  - `update_updated_at_column()` now PRESERVES the client timestamp when it is newer than the stored row (previously always stamped `NOW()` making client timestamps useless). Server-side SQL updates still pass (they set `NOW()` explicitly).
  - **Executions do NOT guard** `products`/`customers`/`suppliers` — variation child re-creation reuses ids after variant removal; those tables keep the client-side `updated_at` skip in SyncEngine.
- **SyncEngine handling:** `P0007`/`stale_write` → op is dropped (NOT error-queued — the payload is by definition outdated; retry can never succeed) + local refreshes from cloud via realtime/merge. Cloud = truth.
- **Operational note:** device clocks should be synced; a permanently-behind clock will have its edits rejected (correct — newer edits win).

## RULE F22 — VARIANT-RESTOCK LEDGER (PERMANENT)

- Variant stock edits/restock must ALWAYS flow through `variant_stock_history` (trigger updates `products.variant_data[].stock`) — never through the stripped `variant_data` in product payloads (silently lost before this rule).
- `purchase_records` carries `variant_id`/`variant_label` so stock-in can target ONE variant: `purchaseRecordsService.create` writes ONE `purchase` variant history entry (+qty) and `purchaseRecordsService.delete` reverses it with ONE `adjustment` entry (−qty) — single-reversal (F12) at variant level too.
- All stock-in paths (`commitStockInToInventory`, BatchStockInSystem, ProductDetailHub quick restock) use the SHARED `commitStockInToInventory` helper — parallel stock-in implementations are BANNED (AGENTS.md rule 18).
- ProductDetailHub direct variant-stock field edits log `adjustment` delta entries (previously silently never synced).

## RULE F23 — GUIDE + GUARD-PATTERN REGISTRATION (PERMANENT — every new financial function)

- 📖 **[docs/SYSTEM_FUNCTIONS_GUIDE.md](docs/SYSTEM_FUNCTIONS_GUIDE.md) is the live source of truth** for every DB function/trigger/flow (F21 guard flow, F22 variant ledger, sync/recovery, troubleshooting). Read it before touching SQL/sync/financial logic; UPDATE it in the SAME change as any schema/flow change (stale guide = violation, same spirit as AGENTS.md rule 18).
- EVERY new financial table/function MUST follow the guard pattern checklist (§6 of the guide): 3 triggers per table (`guard_stale_write_*`, `record_row_tombstone_*`, `update_*_updated_at`), append-only ledger triggers for stock/log tables, shared-helper service layer (F12 single-reversal), localDb + SyncEngine (P0007/F17/F18) wiring.
- Register the new function in the guide's §2 registry + add SCHEMA CHANGE LOG entry + run the §7 TEST BATTERY on ALL active clone projects (expect identical results: currently `f21_guards=24`, `tombstones=1`, `functions=7`) — no PASS = no "done".
- NEVER add a financial write path without its guards — the DB layer is the last line of defense against cross-device corruption (F21) and silent stock loss (F22).

## RULE F24 — ESTORE/ONLINE ORDER: NO SALE & NO STOCK UNTIL POS BILL (PERMANENT)

- 🛒 **An online store order (store_orders) MUST NOT create a Sale and MUST NOT change inventory stock (product.stock / variant stock) until it is billed at the POS (CheckoutPage → commitSaleAuthoritative).**
- Flow (BY DESIGN, never deviate):
  1. Customer places order on e-store → only a `store_orders` row is created (status `pending`/`preparing`/`out_for_delivery`/`delivered`). **No sale, no stock delta.**
  2. Admin opens Online Orders → "Load to POS" → `SET_CART` (cart carried to POS only). Still **no sale, no stock delta.**
  3. Cashier bills at POS → `commitSaleAuthoritative` runs → Sale created + stock deducted (and reserved stock released) — THIS is the single point of inventory truth.
- ⛔ Forbidden: any RPC/function/UI that reserves, deducts, or otherwise mutates stock on order placement; any code that creates a Sale/transaction from a store order outside the POS bill path.
- Order status auto-advance (OrderTracker `delivered`) does NOT create a sale or touch stock — status is cosmetic only.
- This rule exists so inventory can NEVER be wrong: stock only ever moves when a real bill is struck at POS. Violation = data-corruption bug.

## RULE F25 — TRUE CLOUD SYNC ON MANUAL REFRESH (PERMANENT)

- **Problem:** Devices lose sync sync when offline or if realtime websocket fails. Clicking standard refresh (`window.location.reload()`) reads stale data from local IndexedDB instantly, dismissing loaders while the actual cloud fetch happens invisibly in the background. Users think the data is still broken/stale.
- **Requirement:** The global Refresh button (in `Header.tsx` or anywhere else) MUST invoke a dedicated `forceSync()` method (from `useApp()`).
- **Implementation:** `forceSync()` clears the local sync cursor (`localDb.syncHistory.clear()`) and triggers `loadData(false, true)` where `forceCloudSync = true`. This parameter ensures that `loading = true` is maintained until the complete background fetch is finished and data is merged locally. Only then is the loader dismissed. 
- **Result:** Manual refresh guarantees a 100% exact parity with the cloud database across all tables immediately upon completion. Any generic `window.location.reload()` for data sync purposes is completely banned.

## RULE F26 — 24-HOUR LOGIN EXPIRY & NETWORK RESILIENCE (PERMANENT)

- **Problem:** Users can be randomly logged out mid-shift if session expiry depends on the wrong clock rules, or if a temporary network drop causes a token refresh to fail (leading to an unwanted `signOut()`). 
- **Requirement:** Session expiry MUST be exactly 24 hours (`pos_session_start`). Unnecessary logouts caused by network issues or temporary server unavailability are STRICTLY BANNED.
- **Implementation:** Check the difference in hours between `Date.now()` and `pos_session_start`. If `>= 24`, explicitly remove the session and sign out. When refreshing the token via Supabase, you MUST check if the error is a network error (`Failed to fetch`, offline, etc). If it is a network error, **do not sign out**. Fallback to the cached `pos_offline_profile` and allow the system to recover gracefully when the network returns.

---

# 🗄️ DATABASE MIGRATION RULES (THE GOLDEN RULE)

Whenever ANY change to database structure is made:

1. **Create Incremental Migration**: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. **Update Master Schema**: `supabase/schema/SUPER_MASTER_SCHEMA.sql`
3. **Run SQL via Management API** (NOT psql / Dashboard):
   ```bash
   SQL=$(cat supabase/migrations/20260519120000_description.sql)
   SQL_JSON=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SQL")
   curl -X POST "https://api.supabase.com/v1/projects/$SUPABASE_REF/database/query" \
     -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" \
     -H "Content-Type: application/json" \
     -d "$SQL_JSON"
   ```
4. **Sync Local DB**: Update `src/lib/localDb.ts`
5. **Log & Document**: Add comment at top of migration file

> 🔍 **Get project ref from URL:** `https://{ref}.supabase.co` — or list all projects via `curl -s "https://api.supabase.com/v1/projects" -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY"`

### 🚨 Troubleshooting Cheatsheet
- `AUTO-BLACKLISTED COLUMN: 'xyz'` → Column missing in Supabase. Run `ALTER TABLE`.
- `400 Bad Request` → Schema mismatch or column type error. Check Network tab.
- `403 Forbidden` → RLS policy violation. Check `pg_policies`.
- `Reset to 0` → Field missing in `initialState` or overwritten by `null`. Check `mapSettings` defaults.
- `Stock mismatch in audit` → Run `SELECT * FROM audit_stock_integrity();` and fix each product.
- `Duplicate product` → UI must catch and show error, never create second entry.

---

# 🧠 Project Knowledge Base

### Core Context & State
- **Global State**: `src/context/SupabaseAppContext.tsx`
- **Auth Logic**: `src/context/SupabaseAppContext.tsx`

### Database & Sync Logic
- **Local DB**: `src/lib/localDb.ts`
- **Sync Engine**: `src/lib/syncEngine.ts`
- **API Services**: `src/lib/services.ts` ← All CRUD operations live here
- **Master Schema**: `supabase/schema/SUPER_MASTER_SCHEMA.sql`

### UI Components
- **Global Dialog System**: `src/lib/dialog.tsx` & `src/shared/ui/DialogProvider.tsx`
- **🧱 Shared UI Library (MANDATORY — 100% COVERAGE, POS-exempt)**: `src/shared/ui/` — `Button`, `Card`, `Badge`, `SegmentedControl`, `ToggleSwitch`, `SubTabBar`, `Avatar`, `Pagination`, `LoadMoreButton`, `DateRangePicker`, `EmptyState`, `BottomSheet`, `Select`. Import from `../../shared/ui`. **The ENTIRE project (Settings, /store estore, all admin routes, reports, inventory) uses ONLY these modules — POS (`src/components/pos/**`) is the ONLY exemption.** Native `<select>` and hand-rolled buttons are banned outside POS. Estore uses shared wrappers with `!`-prefixed className overrides for its theme-var system. **Every new page/component MUST reuse these exact modules (visual tweaks via `!`-prefixed `className` overrides only — never page-local variants).** Full registry with props + bans: [docs/MODULES.md](docs/MODULES.md) — must stay up to date.
- **Shared Search/List/Drag Modules (MANDATORY on non-POS routes)**: `src/shared/modules/search-and-list/` — `SharedSearchBar`, `SharedProductList`/`SharedProductListItem`, `useDragDropList` + `DragHandle`.
- **Shared Business Logic**: `src/lib/stockInCommit.ts` — `commitStockInToInventory()` is the ONLY stock-in commit path (used by PurchaseOrderSystem + ProductDetailHub Quick Restock). Never write a second implementation.
- **Scanner**: `src/shared/ui/CameraScanner.tsx`
- **POS Interface**: `src/components/pos/`
- **Settings**: `src/components/settings/Settings.tsx`
- **Inventory**: `src/components/inventory/`
- **Reports**: `src/components/reports/`

### Entry Points
- **Web Entry**: `src/main.tsx`
- **Main App**: `src/App.tsx`
- **Style Tokens**: `src/index.css`

---

# 🏗️ FEATURE IMPLEMENTATION WORKFLOW (GOLDEN ORDER)

1. **DB Plan**: Design tables, columns, RLS rules
2. **Supabase SQL**: Run via Management API (`curl` + `sbp_` token) — see [@docs/supabase-api-guide.md](docs/supabase-api-guide.md) §5
3. **Local DB**: Add to `localDb.ts`
4. **Types**: Define interfaces in `types.ts`
5. **SyncEngine**: Register new entity
6. **Services**: Write CRUD in `services.ts` following F1-F8 rules above
7. **UI Component**: Build React page using [docs/UI_RULES.md](docs/UI_RULES.md) design rules

---

# 🔑 CREDENTIALS UPDATE RULE

When user says "credentials update karo" or provides new Supabase details, update:

| File | What to Update |
|------|---------------|
| `.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_MGMT_API_KEY` |
| `.env` (root) | Same as `.env.local` |

To get keys for a new project via Management API (no Dashboard needed):
```bash
> Get API keys (anon + service_role)
curl -s "https://api.supabase.com/v1/projects/{ref}/api-keys?reveal=true" \
  -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY"
```

After update: run `npm run build`, clear browser IndexedDB.

---

# ⚙️ SETTINGS SYNC STRATEGY

- **Local-First Handshake**: Load remote only if cloud `updatedAt` is 5+ minutes newer than local
- **Strict Snake-Case Mapping**: `mapSettings` always prioritizes Supabase snake_case. Never use spread operator
- **Instant Persistence**: Every setting syncs immediately on change via `handleInstantUpdate`
- **Singleton ID**: Always use `00000000-0000-4000-8000-000000000001`
- **Type Safety**: Font Weight always String. Sliders use correct type.

---

# 🤖 AI AGENT OPERATING RULES

1. **Think Before Acting**: Analyze, break into steps, avoid unnecessary complexity
2. **Code Quality**: Clean, readable, modular, DRY
3. **Project Awareness**: Read existing files, respect architecture, do NOT rewrite unnecessarily
4. **Minimal Scanning**: Only read files directly related to the task
5. **File Verification**: Before editing a component, verify its actual usage in `App.tsx`
6. **DATA SAFETY**: Never make changes that could corrupt financial data without explicit confirmation
7. **🎨 STRICT UI PROTOCOL (MANDATORY)** — Before writing or editing ANY UI code (React components, Tailwind, CSS), you MUST read **[docs/UI_RULES.md](docs/UI_RULES.md)** and **[docs/MODULES.md](docs/MODULES.md)** first. Never introduce new inline styles, hardcoded colors, or one-off components when a shared module already covers the case — always the SAME shared module everywhere.
8. **🖼️ CENTRALIZED MEDIA SELECTOR & COMPRESSION (MANDATORY)**: All image uploads or selection workflows (products, deals, settings, logo, etc.) MUST route strictly through the centralized `MediaLibrary` component. Direct file upload triggers are banned outside the library. This enforces automatic image compression (WebP, 20-50KB target) via shared `compressImage` (src/shared/imageCompression.ts) and permits image reuse across the database.
9. **🎯 BRAND ISOLATION RULE**: Only `/store` route uses saved business name + logo from settings. All other app routes (POS, admin, reports, inventory, etc.) MUST always use hardcoded Zaynahs defaults ("Zaynahs POS" + `/zaynahs-logo.svg`). Files enforcing: `src/lib/dynamicManifest.ts`, `src/App.tsx`, `index.html`. The original gradient-Z SVG at `/zaynahs-logo.svg` is the permanent default and must never be deleted.

---

# 🚨 ERROR HANDLING PROTOCOL

When user pastes any error or screenshot:
1. Identify type from Troubleshooting Cheatsheet above
2. Read ONLY the relevant file
3. Fix + migration if DB related
4. One response, complete fix, no back and forth

---

# 📁 FILE CREATION RULE

- Check `App.tsx` routing first
- Follow existing component structure
- Auto-register in router if it's a page
- Never create dead/unused files

---

# 🔍 STOCK INTEGRITY VERIFICATION QUERIES

Run these any time stock looks wrong:

**1. Duplicate products:**
```sql
SELECT name, COUNT(*) as count FROM products GROUP BY name HAVING COUNT(*) > 1;
```

**3. Sales without shift:**
```sql
-- SHIFT SYSTEM REMOVED (2026-08-12) — no shift_id column exists anywhere.
```

**4. Expenses without shift:**
```sql
-- SHIFT SYSTEM REMOVED (2026-08-12) — no shift_id column exists anywhere.
```

**5. Sales with missing purchase cost:**
```sql
SELECT id, created_at FROM sales
WHERE items::text LIKE '%"purchaseCost":0%'
   OR items::text LIKE '%"purchaseCost":null%';
```

---

# 🔧 ZAYNAHS POS — COMPLETE FIX PROMPT

You are a senior POS system engineer with 20 years experience. 
Read the ENTIRE codebase first, then fix ALL issues below in one pass. 
Do NOT break existing functionality. Fix in exact order given.

---

## STEP 1 — READ THESE FILES FIRST (before touching anything)

Read all of these completely:
- `src/lib/services.ts`
- `src/context/SupabaseAppContext.tsx`
- `src/components/pos/CheckoutModal.tsx`
- `src/components/reports/ReportsManager.tsx`
- `src/lib/localDb.ts`
- `src/lib/syncEngine.ts`
- `supabase/schema/SUPER_MASTER_SCHEMA.sql`

---

> 🔧 Fix process: bugs ko exact order me fix karo, existing functionality mat todo. Ek response me complete fix do, back-and-forth nahi.

---

# ⏱️ RETENTION & AUTO-CLEANUP RULES

### RULE R1 — AUTOMATIC 24-HOUR RETENTION FOR CANCELLED ORDERS
Every cancelled order (`status === 'cancelled'`) must be automatically pruned after 24 hours of inactivity.
This is implemented in `syncEngine.ts` inside `pruneExpiredCancelledOrders()`, which runs at app startup and every hour.
It performs a dual-cleanup:
1. **Local cache deletion**: Queries Dexie IndexedDB `sales` and deletes expired ids to keep local storage light.
2. **Cloud sync deletion**: Executes a Supabase REST API `DELETE` query targeting matching cancelled rows to keep remote storage clean.

To implement similar auto-deletion models in the future:
- Ensure the target column is indexed in IndexedDB (`localDb.ts`) for fast queries.
- Query locally via Dexie `.toArray()`, filter by timestamp, and call `bulkDelete()`.
- Query remotely via Supabase REST API `.delete().eq('status', ...).lt('updated_at', cutoff)`.
- Register the cleanup function inside `startSyncEngine()` startup and the background interval timer.

---

# 🚀 DEPLOYMENT & CLONE GUIDE
## FULL DATABASE PUSH WORKFLOW

1. Ensure `SUPABASE_MGMT_API_KEY` is set in `.env.local` (or env)
2. Execute `SUPER_MASTER_SCHEMA.sql` via Management API:
   ```bash
   SCHEMA_SQL=$(cat supabase/schema/SUPER_MASTER_SCHEMA.sql)
   SCHEMA_JSON=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SCHEMA_SQL")
   curl -X POST "https://api.supabase.com/v1/projects/$SUPABASE_REF/database/query" \
     -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" \
     -H "Content-Type: application/json" \
     -d "$SCHEMA_JSON"
   ```
3. Execute `scratch/sync_settings.sql` same way
4. Verify dashboard loads correctly

---


## PROJECT CLONE GUIDE

Jab bhi aap is project ko kisi **naye Supabase project** par shift (clone) karein, toh yeh guide follow karein taake koi error na aaye aur database sleep na ho.

> ⚡ **No Prisma, no psql, no Dashboard needed.** Sab kuch Management API (`sbp_` token) se hoga. See [@docs/supabase-api-guide.md](docs/supabase-api-guide.md) for reference.

---

## STEP 1: Credentials Update (Env Variables)
Sab se pehle naye Supabase project ki details in files mein update karein:

1. **`.env.local`** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_MGMT_API_KEY`
2. **`.env.local 2`** (pos-admin clone wala env) — same values + `SUPABASE_PROJECT_REF`
3. **`.env`** (Root folder mein, agar exist kare) — same values

> Naming rule: Ye project files `.env.local` aur `.env.local 2` use karta hai — naye files mat banao, inhi ko update karo. Docs/setup.md ka `env_backups/` rule bhi follow karo — kabhi credentials guess/mix nahi.

> `SUPABASE_MGMT_API_KEY` wohi `sbp_...` token hai jo aapne pehle [Supabase Dashboard → Access Tokens](https://supabase.com/dashboard/account/tokens) se generate kiya tha. Ek hi token sab projects ke liye kaam karta hai.

---

## STEP 2: Database Schema Push
Management API ke zariye database tables banayein (koi Prisma / psql nahi):

```bash
# 1. Pehle project ref nikaalo (agar nahi pata)
curl -s "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY"

# 2. Schema push karo via Management API
SCHEMA_SQL=$(cat supabase/schema/SUPER_MASTER_SCHEMA.sql)
SCHEMA_JSON=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SCHEMA_SQL")
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$SCHEMA_JSON"
```

---

## STEP 3: Admin User Setup (Most Important)
Naye project mein login ka issue na aaye, iske liye yeh lazmi karein:

1. **Email Confirmation OFF karein** (via Management API):
   ```bash
   curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/config/auth" \
     -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"SAML_EXTERNAL_EMAIL_ENABLED": false}'
   ```
   Ya **Dashboard** > **Authentication** > **Settings** > `Confirm Email` OFF kar dein.

2. **Naya Admin Banayein** (via Management API, Dashboard ki zaroorat nahi):
   ```bash
   # Pehle anon aur service_role keys nikaalo
   KEYS=$(curl -s "https://api.supabase.com/v1/projects/{ref}/api-keys?reveal=true" \
     -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY")
   ANON=$(echo $KEYS | python3 -c "import json,sys; keys=json.load(sys.stdin); print([k['api_key'] for k in keys if k['name']=='anon'][0])")
   SERVICE=$(echo $KEYS | python3 -c "import json,sys; keys=json.load(sys.stdin); print([k['api_key'] for k in keys if k['name']=='service_role'][0])")
   SUPABASE_URL="https://{ref}.supabase.co"

   # Admin user banao
   curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
     -H "Authorization: Bearer $SERVICE" \
     -H "apikey: $ANON" \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@email.com", "password": "Admin@123", "email_confirm": true}'
   ```
   *Note: `handle_new_user` first-user auto-admin REMOVED (2026-08-16). Role CHECK ab sirf `(cashier, salesman)` hai. Admin role DB level pe auto-set nahi hota — admin user banane ke liye:
   1. User create karo (upar wali command)
   2. Phir `users` table me us user ki row update karke role admin logic app side handle karo — ya pehle user ko app ke andar manually admin banao (app settings > Users > role).
   `user_metadata.role` sirf metadata hai — DB `users.role` column hi authoritative hai.*

---

## STEP 4: Keep Database Alive (Sleep Prevention)
Supabase ka free plan 1 hafte baad database pause kar deta hai. Isey 24/7 active rakhne ke liye sab se asaan auto-ping setup karein (ismein kisi api key/header ki zaroorat nahi):

1. **cron-job.org** par jayen aur free account banayen.
2. **Create Cronjob** par click karein.
3. **COMMON Tab Settings:**
   * **Title**: `Supabase Keep Alive`
   * **URL**: `https://[AAPKA_SUPABASE_ID].supabase.co/auth/v1/health` (Yeh public link hai)
   * **Execution schedule**: `Every 3 days` (Ya Every day)
4. **ADVANCED Tab Settings:**
   * Neechay ja kar **Headers** mein 2 lines add karein:
     * **Header 1** -> Key: `apikey` | Value: `[Aapki_Anon_Key]`
     * **Header 2** -> Key: `Authorization` | Value: `Bearer [Aapki_Anon_Key]`
5. **SAVE** karein aur ek dafa **TEST RUN** daba kar check karein ke **200 OK** aa raha hai ya nahi.

---

# 📜 SCHEMA CHANGE LOG
> See `CHANGELOG.md` for the full historical audit trail of database and schema changes.
