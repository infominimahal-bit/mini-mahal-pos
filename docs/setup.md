# 🚀 Zaynah's POS — System Guide (Condensed)

> Single source of truth for running + setting up the POS. **Cloud-Direct** architecture (no offline/sync engine). Keep this file in sync with every change (AGENTS.md + GEMINI.md rule).

**Contents:** 1 Overview · 2 Architecture · 3 Schema (Tables/Indexes/RPCs/Realtime/Seed) · 4 Services · 5 Auth · 5a Settings Keys · 5b Components · 6 Fresh Setup · 7 Existing Sync · 8 Verification · 9 Migration · 10 Troubleshooting · 11 Dev & Deploy · 12 Mgmt API · 13 Agent Rules.

---

## 1. System Overview

**Local-сloud model = Cloud-Direct.** Supabase is the ONLY source of truth. Every mutation goes through an atomic RPC / `cloudWrite.ts` → awaits the cloud → throws on error (no silent retry, no local queue).

### Core Principles
| Principle | Description |
|-----------|-------------|
| **1 Clone = 1 Shop** | Own code clone + own Supabase project. No `workspace_id`, no multi-tenant. |
| **Cloud-Direct** | Mutations hit Supabase RPC/DB tx directly. No `syncEngine`, no `queueOp`, no `pendingOps`, no offline queue. |
| **Management API Only** | All DB ops via Supabase Management API (`sbp_` token). No Prisma, no `DATABASE_URL`. |
| **Realtime** | OFF by default (single-device bandwidth). Enable in `SupabaseAppContext.tsx` for multi-device. |

### ⚠️ MAJOR RULES (non-negotiable)
1. **Code = UNIVERSAL** — no shop-specific hardcoded logic; branding from settings.
2. **Env/Credentials from `env_backups/`** — never guess/mix; one shop = one env file.
3. **All Fixes → ALL Projects** — apply to every repo, verify deploy + DB after.
4. **Code 1 / Credentials Separate** — same codebase, per-shop env (URL/keys/mgmt token).
5. **Master Schema = SAME** — `SUPER_MASTER_SCHEMA.sql` is identical on all projects.
6. **Systems IDENTICAL** — F21 guards, F22 variant ledger, atomic RPCs, reports behave same on all DBs.
7. **Docs Current** — update `setup.md`, `GEMINI.md`, `MODULES.md`, `UI_RULES.md` on every change.

### Data Flow (Cloud-Direct)
```
User Action → React Context/Store → cloudWrite() → Supabase RPC/DB tx (AWAITED)
                                              ↕ all-or-nothing; error throws to UI
                                   Realtime (optional) → other tabs/devices
```
- Online SALE: `commit_sale` commits to cloud first; on cloud failure the operation throws (no partial local commit).
- Returns/refunds: atomic RPC reverses stock via `stock_history` trigger. No offline queue.

---

## 2. Architecture

### Key Directories
```
src/
  types/index.ts              # ALL interfaces
  context/SupabaseAppContext.tsx  # global state (useApp) + cloud loaders
  lib/supabase.ts             # supabase client
  lib/cloudWrite.ts           # SINGLE cloud write path (atomic RPCs)
  lib/localDb.ts              # Dexie — DISPLAY-ONLY cache (not source of truth)
  lib/services/              # one service file per entity + barrel index.ts
  lib/actionToken.ts         # signed tokens for financial RPC guards
  components/pos|inventory|reports|settings|...
  stores/                    # Zustand stores (one per domain)
supabase/
  schema/SUPER_MASTER_SCHEMA.sql   # SINGLE SOURCE OF TRUTH (full DDL, idempotent)
  migrations/*.sql                 # incremental changes
docs/  setup.md, UI_RULES.md, MODULES.md, SYSTEM_FUNCTIONS_GUIDE.md, TESTS_GUIDE.md
env_backups/   # per-shop .env files
AGENTS.md   # how to work  |  GEMINI.md  # master rules (SCHEMA CHANGE LOG + F-rules)
```

### Tech Stack
React 18 · TypeScript 5 · Vite 5 · Tailwind 3 · Dexie 4 (cache only) · Supabase JS 2 · React Router 6 · Vite PWA · lucide-react.

---

## 3. Database Schema (current)

### Tables (31 — `store_orders` e-store fully removed 2026-08-23)
`app_settings`, `bundles`, `bundle_items`, `categories`, `customer_ledger`, `customers`, `discounts`, `expenses`, `payment_modes`, `payment_movements`, `payments`, `price_history`, `product_addons`, `product_toppings`, `products`, `purchase_order_items`, `purchase_orders`, `purchase_records`, `row_tombstones`, `sale_audit_log`, `sales`, `sales_tabs`, `salesmen`, `sessions`, `stock_history`, `stock_mismatches`, `supplier_transactions`, `suppliers`, `toppings`, `users`, `variant_stock_history`.

### Key Indexes
| Table | Index | Purpose |
|-------|-------|----------|
| `sales` | `idx_sales_timestamp` | Date-range queries |
| `sales` | `idx_sales_customer_id` | Customer history |
| `sales` | `idx_sales_invoice_number` | Invoice lookup |
| `sales` | `idx_sales_created_at_status` | Reports |
| `products` | `idx_products_name` | Search by name |
| `products` | `idx_products_barcode` | Barcode scan |
| `product_batches` | `idx_product_batches_product_id` / `idx_product_batches_expiry` | Batch/expiry *(table removed — legacy)* |

### Atomic RPCs (all stock/sale ops)
| Operation | RPC |
|-----------|-----|
| New sale | `commit_sale(p_sale, p_history)` — idempotent via `idempotency_key` |
| Restock | `commit_restock(p_purchase_record, p_stock_history, p_supplier_transaction)` |
| Expense | `commit_expense(p_expense, p_payment_movements)` |
| Payment/wallet moves | `apply_payment_movements(p_moves)` (idempotent per movement id) |
| Stock moves | `apply_stock_movements(p_history)` |
| Manual adjust | `stock_adjustment(p_product_id, p_change_qty, p_type, p_note, p_cashier, p_variant_id, p_variant_label, p_adjustment_id)` — idempotent |
| Delete sale (reverse) | `delete_sale_atomic(...)` — hard-delete + `row_tombstones` + reverse stock |
| Refund | `refund_sale_atomic(...)` — double-reversal guard + over-refund cap |
| Edit bill | `edit_sale_atomic(...)` — reverse old + insert new in one tx |
| Invoice # | `get_next_invoice_number()` |
| Reconcile | `reconcile_now()` |
| Auth | `admin_block_user`, `admin_change_password`, `revoke_user_sessions` |

> Legacy e-store function DEFINITIONS (`process_sale`, `process_return`, `place_estore_order`, etc.) still exist in `SUPER_MASTER_SCHEMA.sql` — dead code, never executed (dropped from live DB 2026-08-23).

### Stock Architecture (CRITICAL)
- **Cloud = ONLY authoritative source for `products.stock`.**
- Stock changes ONLY via `stock_history` / `variant_stock_history` inserts → DB trigger (`trigger_update_product_stock`) auto-updates `products.stock`.
- **NEVER write `products.stock` directly from frontend.** Only DB triggers write it. (Enforced across all product-edit/adjust/batch flows.)
- Realtime cloud updates overwrite local cache (no guards).

### Realtime Publication
`ALTER PUBLICATION supabase_realtime SET TABLE` — all tables above (minus `row_tombstones`). Verify with `pg_publication_tables`.

### Seed / Grants
```sql
INSERT INTO app_settings (id) VALUES ('00000000-0000-4000-8000-000000000001') ON CONFLICT (id) DO NOTHING;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
```

---

## 4. Services & API Layer (`src/lib/services/`)

- `salesService`, `productsService`, `customersService`, `settingsService`, `categoriesService`, `suppliersService`, `bundlesService`, `discountsService`, `batchesService`, `expensesService`, `stockHistoryService`, `purchaseOrdersService`, `paymentsService`.
- **Settings mapping** (`mapSettings`/`toRemoteSettings`): snake_case ↔ camelCase, never spread.
- **Write path**: `cloudWrite(entity, op, id, payload)` → atomic RPC or `supabase.from(...)` with `withActor` stamping for RLS. Idempotent: duplicate-key (23505) treated as success.

---

## 5. Auth Flow

1. Email/password sign in → Supabase JWT.
2. `handle_new_user()` trigger creates `public.users` row on signup (`role='cashier'` default).
3. First admin must be bootstrapped via API + direct `public.users` insert with `role='admin'`.
4. Cached profile in localStorage for offline display; `onAuthStateChange` restores session.
5. **No RLS on most tables** (single-tenant, anon GRANT ALL). 3 ledger tables (`stock_history`, `variant_stock_history`, `row_tombstones`) may carry append-only RLS.
6. **Roles**: `admin` | `manager` | `cashier` | `salesman`. Financial RPC guards via `require_action()` inside `delete_sale_atomic` (admin|manager), `refund_sale_atomic` (admin|manager|cashier), `edit_sale_atomic` (admin|manager). `commit_sale`/`apply_payment_movements` = anon.
7. Block/delete → `revoke_user_sessions(p_user_id)` invalidates sessions.

---

## 5a. Settings Keys
| Key | Type | Default | Section |
|-----|------|---------|----------|
| `storeName` | string | '' | Core |
| `storeAddress` | string | '' | Core |
| `storePhone` | string | '' | Core |
| `storeEmail` | string | '' | Core |
| `storeLogo` | string | '' | Core |
| `storeWebsite` | string | '' | Core |
| `taxRate` | number | 0 | Finance |
| `currency` | string | 'PKR' | Finance |
| `theme` | string | 'dark' | UI |
| `interfaceMode` | string | 'touch' | UI |
| `receiptPaperSize` | string | '80mm' | Receipt |
| `receiptTemplate` | string | 'modern' | Receipt |
| `receiptFontWeight` | string | '400' | Receipt |
| `receiptDensity` | number | 1.0 | Receipt |
| `enableSplitPayment` | boolean | false | Payment |
| `enableExtraCharges` | boolean | false | Payment |
| `allowCreditOverLimit` | boolean | true | Payment |
| `enableKotPrinter` | boolean | false | Kitchen |
| `autoSaveReceiptPng` | boolean | false | Auto-save receipt PNG |
| `posGridColumns` | number | 4 | POS |
| `soundEnabled` | boolean | true | System |
| `offlineMode` | boolean | true | Sync *(DEAD — sync removed)* |
| `autoSync` | boolean | true | Sync *(DEAD — sync removed)* |
| `touchKeyboardEnabled` | boolean | false | POS |
| … 50+ more keys (full list in code `app_settings` / `GEMINI.md`) | | |

**Singleton ID** (settings row): `00000000-0000-4000-8000-000000000001` (`SETTINGS_ID`).

## 5b. Component Architecture
- **POS Flow:** `POSTerminal.tsx` → search/select products → `Cart.tsx` → discounts → `CheckoutPage.tsx` (payment) → `ReceiptPrint.tsx` → if `enableKotPrinter` → `KOTPrint.tsx` (500ms delay).
- **Settings Flow:** `Settings.tsx` → General / Receipt & Printer (KOT toggle) / Barcode / Inventory / Users.
- **Global State** (`SupabaseAppContext.tsx`): `settings`, `products`, `sales`, `customers`, `categories`, `suppliers`, `bundles`, `discounts`, `expenses` *(+ `syncState` REMOVED)*, `language`.

---

## 6. Fresh Project Setup

### Step 1–4: Clone + Supabase project + keys + `.env.local`
```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon>
VITE_SUPABASE_SERVICE_ROLE_KEY=<srk>
SUPABASE_MGMT_API_KEY=sbp_...
SUPABASE_REF=<ref>
```

### Step 5: Run Master Schema (idempotent — creates everything)
```bash
SCHEMA_SQL=$(cat supabase/schema/SUPER_MASTER_SCHEMA.sql)
SCHEMA_JSON=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SCHEMA_SQL")
curl -X POST "https://api.supabase.com/v1/projects/$SUPABASE_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" -H "Content-Type: application/json" -d "$SCHEMA_JSON"
```
Creates: all tables + columns + indexes + functions (commit_sale, commit_restock, commit_expense, apply_stock_movements, apply_payment_movements, delete_sale_atomic, refund_sale_atomic, edit_sale_atomic, stock_adjustment, reconcile_now, get_next_invoice_number, admin_block_user, admin_change_password, revoke_user_sessions) + stock/variant triggers + F21 stale-write guards + F22 variant ledger + RLS + realtime publication + grants + seed.

### Step 6: Deploy Edge Functions (user auth)
```bash
export SUPABASE_ACCESS_TOKEN=$SUPABASE_MGMT_API_KEY
npx supabase functions deploy admin-users --project-ref $SUPABASE_REF --no-verify-jwt
```

### Step 7: Build
```bash
npm run build
```

### Step 8: Deploy (Cloudflare Pages / Vercel)
Per-shop via `wrangler pages deploy dist` (CF) or Vercel git integration/hook. See §Deploy Guide.

### Step 9: Create Admin User
```bash
# 9a. Auth account (service role)
curl -s -X POST "https://$SUPABASE_REF.supabase.co/auth/v1/admin/users" \
  -H "Authorization: Bearer $SRK" -H "apikey: $SRK" -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"123456","email_confirm":true}'
# 9b. public.users admin row
curl -s -X POST "https://api.supabase.com/v1/projects/$SUPABASE_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" -H "Content-Type: application/json" \
  -d '{"query":"INSERT INTO public.users (id,username,name,email,role,permissions,active,created_at,updated_at) VALUES ('\''<auth_id>'\'','\''admin@gmail.com'\'','\''admin'\'','\''admin@gmail.com'\'','\''admin'\'','\''{}\''',true,now(),now()) ON CONFLICT (id) DO UPDATE SET role='\''admin'\'', active=true;"}'
```

### Step 10: Save `.env` backup → `env_backups/`.

---

## 7. Existing Project Sync

**Option A — Nuclear (recommended):** re-run full `SUPER_MASTER_SCHEMA.sql` (idempotent). Fixes missing columns/indexes/functions/realtime/grants/seed.
**Option B — Individual migrations:** loop `supabase/migrations/*.sql` via Management API.

> After a TOTAL cloud wipe: clear browser IndexedDB + localStorage before reload (else stale local rows re-sync as duplicates).

---

## 8. Post-Deployment Verification (run all)
1. **Column exists**: `enable_kot_printer`, `variant_data`, `split_payments`, `extra_charges`, `auto_save_receipt_png`, etc.
2. **Realtime publication**: tables listed (no `row_tombstones`).
3. **Functions**: the atomic RPC set above present.
4. **Grants**: anon has INSERT/SELECT/UPDATE/DELETE on all tables.
5. **Seed**: exactly 1 `app_settings` row (`0000...0001`).
6. **Build**: `npm run build` → 0 errors.
7. **Dashboard**: POS/Settings/Products load, 0 console errors.
8. **Realtime** (optional): 2 tabs converge.
9. **KOT print**: enable → sale → 500ms KOT dialog.

---

## 9. Migration Workflow
1. `supabase/migrations/YYYYMMDDHHMMSS_description.sql` (idempotent `ADD COLUMN IF NOT EXISTS`).
2. Update `SUPER_MASTER_SCHEMA.sql` (table block + ALTER section).
3. Update `localDb.ts` / `types/index.ts` / `services/` / `constants.ts` if new field.
4. Run via Management API.
5. Update `setup.md` + `GEMINI.md` SCHEMA CHANGE LOG.
6. `npm run build` + verify.

**Rules:** ❌ no Prisma/`DATABASE_URL`; ❌ no `workspace_id`; ✅ Management API only; ✅ master schema + setup.md updated on every change.

### NEW CLONE — AUTO-INSTALL GUARDS (mandatory)
Push full `SUPER_MASTER_SCHEMA.sql` → auto-installs F21 (`row_tombstones` + `guard_stale_write` P0007) + F22 variant ledger + triggers + RLS + realtime. Verify:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/$SUPABASE_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" -H "Content-Type: application/json" \
  -d '{"query":"SELECT t.tablename,t.trigger_name FROM information_schema.triggers t WHERE t.trigger_name LIKE '\''%stale_write%'\'' OR t.trigger_name LIKE '\''%tombstone%'\'' ORDER BY 1,2"}'
```
Expected: `guard_stale_write` + `record_tombstone` on `sales`, `stock_history`, `variant_stock_history`, `purchase_records`, `expenses`, `payments`, `sales_tabs`.

### Financial Integrity Rules (F12–F22)
- **F12 Single-Reversal**: stock reversal exactly once in owning RPC/service; UI re-reversal banned.
- **F13 Draft Rule**: drafts (`status:'pending'`) never touch stock/customer/revenue.
- **F14 Never Truncate**: no `.limit()/.slice()` on financial queries; use `fetchAllPages()`.
- **F15 Partial-Refund Dedupe**: merge `reportSales`+`reportRefunds` by sale id.
- **F16 Wallet Collections**: refund payouts `direction:'out'`, excluded from collections.
- **F17 Queue Merge**: queued `delete` wins; resurrection banned.
- **F18 Realtime Guards**: skip remote UPDATE on pending local change.
- **F19 No Cache Wipe on Fetch Failure**: `.catch(()=>[])` banned.
- **F20 No Silent Ops Drops**: type/constraint errors → op `error` for review.
- **F21 Stale-Write Guard (DB)**: `row_tombstones` + `guard_stale_write()` blocks resurrection (P0007). Newest-wins.
- **F22 Variant-Restock Ledger**: variant stock only via `variant_stock_history` trigger; all stock-in via `commitStockInToInventory` + `applyVariantStockMovement()`.

### Migration Log (recent)
| Date | Migration | Purpose |
|------|-----------|---------|
| 2026-08-23 | `20260823010000_drop_estore.sql` | Remove e-store (`store_orders` + 7 functions) |
| 2026-08-23 | `20260823020000_stock_adjustment_idempotent.sql` | Idempotent `stock_adjustment`; single stock-write path |
| 2026-08-23 | `20260823000000_drop_dead_offline_columns.sql` | Drop `auto_sync`/`offline_mode`/`stock_mismatches` |
| 2026-08-21 | `20260821120000_atomic_sync.sql` | `commit_sale`/`edit_sale_atomic` with idempotency |
| 2026-08-12 | `20260812180000_stale_write_guards_variant_restock.sql` | F21 + F22 |
| 2026-08-12 | `20260812142314_get_next_invoice_number_rpc.sql` | Invoice collision RPC |

> Full changelog in `GEMINI.md` SCHEMA CHANGE LOG.

---

## 10. Troubleshooting
1. **Pages blink on refresh** → absolute asset paths + inline bg; check auth recovery.
2. **KOT enable does nothing** → ensure `enableKotPrinter` column + `formData` init + `KOTPrint` import.
3. **enable_kot_printer = black square** → column missing; run migration; set `formData.enableKotPrinter`.
4. **Sales query timeout** → use `.order('created_at',{ascending:false}).limit(10000)` / `fetchAllPages()`.
5. **401 from HEAD ping** → removed; use `navigator.onLine`+events+visibilitychange.
6. **`loadData` / `Smart deleting` / Sync** → the app loads local data + cleans stale records on first run. Normal; "smart deleting" + "sync complete" messages expected.
7. **Auth lost after refresh** → cached profile used; clear IndexedDB+localStorage if persists.

---

## 11. Development & Deploy

### Local
```bash
npm run dev      # http://localhost:5173
npm run build    # dist/
```

### Run master schema / single migration (Management API)
```bash
SQL=$(cat supabase/schema/SUPER_MASTER_SCHEMA.sql)
curl -X POST "https://api.supabase.com/v1/projects/$SUPABASE_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,sys;print(json.dumps({'query':sys.stdin.read()}))" <<< "$SQL")"
```

### Deploy Guide (4 Shops)
**Mandatory flow:** (1) open `env_backups/` for tokens; (2) check Deploy Map; (3) "all" → push 4 repos + verify, or named shop → push only that remote; (4) verify GH Actions + CF/Vercel after every push. Never push unintended remotes.

| Shop | Remote | Repo | Platform | Domain | env_backups File |
|------|--------|------|----------|--------|------------------|
| jeanzone | `origin` | `zposdb1-crypto/jeanzone` | **CF Pages + Vercel** | jeanzone.zaynahspos.com, jeanzone.pages.dev, jeanzone.vercel.app | `JEANZONE-ENV`, `jeanzone.env.local` |
| atonline | `atonline` | `SUPABASEMAIL1/ATonline` | **CF Pages** | atonline.zaynahspos.com, atonline.pages.dev | `ATOLINE-ENV` |
| minimahal | `minimahalpos` | `infominimahal-bit/mini-mahal-pos` | **Vercel** | mini-mahal-pos.vercel.app | `minimahal-pos.env.local` |
| pizza | `pizzamilano` | `dispacher-zaynahspos/Pizza-Milano` | **Vercel** | pizza-milano.vercel.app | `.env.local.pizza-milano.20260708_202548` |

**Credentials source of truth = `env_backups/` folder.** Per-file tokens:
| env_backups File | Shop | Keys Present |
|------------------|------|--------------|
| `1_jeanzone_old.env.local` / `1_jeanzone.env.local` | jeanzone | Supabase (URL/anon/service/mgmt), GitHub PAT ×2, CF token + account `f61ce1b3c9f0a819714df802366c7248`, Vercel token + project + deploy hook |
| `2_atonline.env.local` | atonline | Supabase, GitHub PAT, CF token + account `43039ad79a149f127dc1c61725163ca6` (no Vercel) |
| `3_minimahal.env.local` | minimahal | Supabase, GitHub PAT, Vercel token + team + project + deploy hook |
| `4_pizzamilano.env.local` | pizza | Supabase, GitHub PAT, Vercel token |

> ⚠️ Never deploy with wrong shop's token (jeanzone token → atonline = forbidden). Each file is its own shop.

**Push all:**
```bash
git push origin main && git push atonline main && git push minimahalpos main && git push pizzamilano main
```
**Push one:** `git push <remote> main`.

**CF Pages:** token verify `curl https://api.cloudflare.com/client/v4/user/tokens/verify`; project create via `.../accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects`. Each shop has its OWN CF account — wrong account → suffixed subdomain. GH Actions workflow `.github/workflows/deploy-cloudflare.yml` builds + deploys + triggers Vercel hook. **CRITICAL:** compute project name in a shell step (`tr '[:upper:]' '[:lower:]'`), never inline `${{ github.event.repository.name | lower }}`; never `if: secrets.X != ''`.

**Vercel:** deploy hook `POST /v1/projects/$PROJECT_ID/deploy-hooks`; verify `GET /v6/deployments?projectId=$PROJECT_ID` → `readyState: READY`. `BLOCKED` = bot-authored commit → `git commit --amend --author=...` + force-push. `repo_no_access` = reconnect/deploy-hook.

**Verify after push:**
```bash
curl -s "https://api.github.com/repos/$OWNER/$REPO/actions/runs?per_page=3" -H "Authorization: Bearer $GITHUB_PAT"
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/deployments?per_page=1" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
curl -s "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=3" -H "Authorization: Bearer $VERCEL_TOKEN"
```

### Deploy Issue Checklist (jab deploy nahi hota)
1. **GH Actions run dekho** — workflow path hai? jobs 0? → YAML broken.
2. **Secrets set hain?** — `GET /repos/{owner}/{repo}/actions/secrets`.
3. **CF project sahi account par?** — pages.dev suffix (`jeanzone-18k`) = galat account.
4. **CF source kya hai?** — `source: null` = git integration nahi, GH Actions/wrangler only.
5. **Vercel BLOCKED?** — bot-authored commit → author fix.
6. **Vercel repo_no_access?** — Deploy Hook use karo.
7. **Purana repo transfer?** — CF/Vercel git integration toot jata hai → relink.

---

## 12. Quick Reference — Management API
```bash
# Run SQL
curl -X POST "https://api.supabase.com/v1/projects/$SUPABASE_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY" -H "Content-Type: application/json" -d '{"query":"SELECT 1"}'
# List projects / get keys
curl -s "https://api.supabase.com/v1/projects" -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY"
curl -s "https://api.supabase.com/v1/projects/$SUPABASE_REF/api-keys?reveal=true" -H "Authorization: Bearer $SUPABASE_MGMT_API_KEY"
```

---

## 13. Agent Rules
- Schema/code/migration change → update `setup.md` + `SUPER_MASTER_SCHEMA.sql` together. Failure = violation.
- **Policy updates (2026-08):** Shift system removed (F7). e-store fully removed (stock never reserved on online order). Cloud-Direct (no offline/sync engine).
- **DB mechanics:** no Prisma/`DATABASE_URL`; Management API only (`sbp_` token); master schema idempotent.
- **RLS audit:** only `stock_history`, `variant_stock_history`, `row_tombstones` carry append-only RLS (anon SELECT + INSERT; service_role ALL).
- **Tombstones:** delete → `record_row_tombstone` + `guard_stale_write` (P0007) blocks resurrection.
