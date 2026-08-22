# Cloud-Direct Architecture Guide — ZaynahsPOS

> **Audience:** Humans (owners/devs) + AI agents (opencode, future maintainers).
> **Scope:** How the POS works AFTER the offline-first → cloud-direct decommission.
> **Golden rule:** **Cloud (Supabase/Postgres) = SINGLE SOURCE OF TRUTH.** Local Dexie DB is display-only cache. CACHE ≠ TRUTH.

---

## 1. TL;DR

- Every **write** goes straight to the cloud via `src/lib/cloudWrite.ts` → Postgres atomic RPCs.
- Every **read** for UI is served from a local **Dexie cache** (`src/lib/localDb.ts`) that is hydrated from the cloud on load and kept fresh by **realtime mirror handlers**.
- There is **NO offline queue, NO sync engine, NO conflict store, NO pendingOps table** anymore.
- If the cloud write fails, the optimistic local cache write is **reverted** and the UI throws — no silent partial save.

---

## 2. Directory map (where things live, and why)

| Path | Role | Why it exists |
|------|------|---------------|
| `src/lib/supabase.ts` | Supabase client (anon key) | Single network entry to cloud. |
| `src/lib/cloudWrite.ts` | **THE** cloud write path | One function = one cloud commit. Replaces old `queueOp`. Atomic RPCs + idempotency + actor signing. |
| `src/lib/actionToken.ts` | `withActor()` / `signAction()` | Signs sensitive actions (reverse/refund/edit) with the user's cloud `offline_hash` so RLS/server enforces identity. |
| `src/lib/localDb.ts` | Dexie **display cache** handle | Fast UI reads, instant search. `isPendingDelete()` now always returns `false` (no offline queue). |
| `src/lib/PosDB.ts` | Dexie schema + stock-recompute hook | `v37` migration **drops `pendingOps`**. `stockReconcileSuspended` flag pauses local stock recompute during cloud/bulk writes. |
| `src/context/useAppLoadData.ts` | Cloud → cache + stores hydration | On login/reload: `cloudFetch` from Supabase, then `localDb.bulkPut` (cache) + Zustand stores (UI). |
| `src/context/SupabaseAppContext.tsx` | `AppProvider`, exposes `loadData/forceSync/loadMoreSales/searchSales` | App-level data orchestration. `forceSync` = manual full re-fetch. |
| `src/context/AuthContext.tsx` + `src/context/auth/*Logic.ts` | Cloud-direct login | `signInLogic` = `supabase.auth.signInWithPassword` (+ `resolve_login_email` for username). No offline-login fallback. |
| `src/context/realtime/handlers-*.ts` | Realtime → cache mirror | `postgres_changes` events update local cache + stores instantly (multi-device live sync). |
| `src/lib/services/*.ts` (saleCreate, saleReturn, saleDelete, saleEdit, paymentsService, …) | Business services | Build payloads, call `cloudWrite`, then mirror result into cache. Never write truth locally. |
| `src/stores/` | Zustand stores (UI state) | UI reads from here; hydrated from cache on load. |
| `src/lib/services/mappers.ts` + `*Mappers.ts` | cloud_row ↔ local_model | Cloud returns `snake_case`; mappers convert to app models. |

---

## 3. WRITE flow (cloud commit)

```
UI action (checkout / return / refund / edit / restock / expense)
   │
   ▼
service  (e.g. src/lib/services/saleCreate.ts → createSale)
   │  builds payload, optimistically writes cache (localDb) for instant UI
   ▼
cloudWrite(entity, opType, id, payload)        ← src/lib/cloudWrite.ts
   │
   ├─ financial entity  → supabase.rpc('commit_sale' | 'commit_restock' |
   │                     'commit_expense' | 'refund_sale_atomic' |
   │                     'delete_sale_atomic' | 'edit_sale_atomic' |
   │                     'apply_payment_movements', …)
   ├─ idempotency: duplicate-key (23505) → treated as success
   ├─ invoice collision → get_next_invoice_number + retry once
   ├─ last-write-wins guard for products/customers/suppliers
   └─ withActor() stamps user/role/signature (RLS)
   │
   ▼
Cloud COMMITS in ONE atomic DB transaction → returns confirmed result
   │
   ├─ SUCCESS → cache already has optimistic row (matches cloud) ✓
   └─ FAIL    → revert local cache write + THROW → UI shows error, no silent save
```

**Key files:** `src/lib/cloudWrite.ts`, `src/lib/services/saleCreate.ts`, `src/lib/services/saleReturn.ts`, `src/lib/services/saleDelete.ts`, `src/lib/services/saleEdit.ts`, `src/lib/services/paymentsService.ts` (`adjustPaymentBalances` → `apply_payment_movements`).

---

## 4. READ flow (cloud → cache → UI)

```
App mount / user login
   │
   ▼
useAppLoadData(initialized, setInitialized)      ← src/context/useAppLoadData.ts
   │  cloudFetch(table) = supabase.from(table).select('*')
   ▼
Promise.allSettled of all cloud tables
   │
   ├─ localDb.bulkPut(...)   → Dexie DISPLAY CACHE (fast future reads)
   └─ useXStore.setX(...)    → Zustand stores (what components render)
```

After this, normal UI rendering reads from **stores** (hydrated from cache). Components never query the cloud on every render.

**Manual refresh:** Header `forceSync` button → `SupabaseAppContext.forceSync()` → `loadData(false, true)`.

---

## 5. REALTIME cache mirror (multi-device)

Files: `src/context/realtime/handlers-core.ts`, `handlers-ledger.ts`, `handlers-catalog.ts`, `handlers-bundles.ts`, wired by `src/context/useAppRealtime.core.ts`.

```
Another device/terminal writes to cloud
   │
   ▼
Supabase postgres_changes event
   │
   ▼
handler maps payload → localDb.put(...) + useXStore update(...)
```

Result: change appears on THIS screen without manual refresh. Cloud stays authoritative; mirror only reflects.

---

## 6. Dexie display cache (the ONLY local DB)

- Handle: `src/lib/localDb.ts` (`export const localDb = new PosDB()`).
- Schema: `src/lib/PosDB.ts`. **`v37` drops `pendingOps`** (offline queue table gone).
- `isPendingDelete()` now always returns `false` — realtime handlers never skip a cloud update.
- Writes to `localDb.*` are **optimistic cache**, never source of truth.
- `stockReconcileSuspended` (PosDB hook) pauses local stock recompute during cloud/bulk writes so the authoritative cloud value isn't double-counted.

**Why keep it (vs pure Nextera style):** instant UI, fast local search, fewer cloud round-trips, tolerance of brief network blips. Cost: one extra cache layer to keep in sync (done via §4 + §5).

---

## 7. Safety layers (beyond plain cloud writes)

| Layer | Where | Purpose |
|-------|-------|---------|
| Atomic RPC | `cloudWrite.ts` | All-or-nothing commit (no partial save). |
| Idempotency | `cloudWrite.ts` (`idempotency_key`) | Duplicate request → existing txn, no double. |
| Action token | `actionToken.ts` (`withActor`) | Sensitive actions signed + server-verified. |
| Audit log | `src/lib/services/auditLogService.ts` → `sale_audit_log` | Immutable record of sensitive actions. |
| Invoice collision retry | `cloudWrite.ts` | Concurrent multi-device sale → fresh number, retry once. |
| Last-write-wins guard | `cloudWrite.ts` | Concurrent product/customer/supplier edit → don't clobber newer cloud copy. |

---

## 8. Auth (cloud-direct)

- `src/context/auth/signInLogic.ts`: `supabase.auth.signInWithPassword` (username resolved to email via `resolve_login_email` RPC).
- `src/context/auth/loadProfileLogic.ts`: loads profile from cloud (no cached offline-profile restore).
- `src/context/auth/signUpLogic.ts`: cloud signup (no offline hash storage).
- Session expiry + block/delete enforcement live in `src/context/AuthContext.tsx` (server-checked, never signs out on network error).

---

## 9. What was REMOVED (decommission)

Deleted files:
- `src/lib/syncEngine.ts` + `src/lib/syncEngine/`
- `src/lib/cloudPull.ts`
- `src/stores/conflictStore.ts`
- `src/components/OfflineBadge.tsx`
- `src/components/layout/SyncQueueManager.tsx` + `SyncQueueManagerImpl.tsx`
- `src/components/layout/SyncStatusBadge.tsx`
- `src/components/shared/ConflictBanner.tsx`
- `src/hooks/useSync.ts`
- `src/lib/syncHelpers.ts`

Code changes:
- `queueOp()` removed from `localDb.ts`; `pendingOps` table dropped via `PosDB` `v37`.
- `saleReturn.ts` / `saleDelete.ts` converted `queueOp` → `cloudWrite`.
- `useAppLoadData.ts` rewritten cloud-direct (removed `pullCloudChanges`/`isSyncEngineBusy`).
- `SupabaseAppContext.tsx` removed `startCloudPull`/`stopCloudPull`/`handleCloudPullChanged`.
- `AppContent`, `SalesTabManager`, `App.core`, `MobileMenuDrawer`, `HeaderActions`, `useSettingsFormImpl`, `useUserModalData`, `AuthContext`, `handlers-core`, `useInvoice` — deleted-module imports/refs fixed.
- Login, settings form, user modal — offline fallback + `offline_hash` local storage parts cleaned (cloud-only `offline_hash` retained only for action-token signing).

---

## 10. Known limitations (be aware)

- **Realtime missed events:** if the realtime socket is down for a long gap, changes made elsewhere won't reach this cache until next `loadData`/`forceSync`/reload. This is display-only staleness — cloud truth is untouched, and stock/wallet validation still happens server-side, so no financial leakage.
  - *Optional hardening:* trigger `forceSync` automatically on realtime reconnect.
- **Cache ≠ truth:** never read `localDb` for a validation decision; validate against the cloud RPC/DB.

---

## 11. Common tasks for agents

| Task | Do this |
|------|---------|
| Add a new entity write | Call `cloudWrite('<entity>', opType, id, payload)` from a service; mirror result into cache + store. |
| Add a new cloud table to UI | Fetch in `useAppLoadData.ts` `cloudFetch(...)`, `bulkPut` to cache, `setX` to store. |
| Mirror a new table in realtime | Add a handler in `src/context/realtime/handlers-*.ts`. |
| Change login | Edit `src/context/auth/*Logic.ts` (cloud only). |
| Inspect cache schema | `src/lib/PosDB.ts` (bump version + add migration if adding a table). |
| NEVER | Write `products.stock` or any financial row directly to `localDb` as truth; use cloudWrite/RPC. |

---

## 12. vs Nextera POS (reference impl)

| | Nextera | ZaynahsPOS (this) |
|---|---|---|
| Local DB | ❌ none | ✅ Dexie (cache only) |
| Writes | plain `supabase.from().insert()` | atomic RPC via `cloudWrite` |
| Realtime | ❌ | ✅ cache mirror |
| Audit / idempotency / action-token | ❌ | ✅ |
| Complexity | simple | production-safe + multi-device |

Both are cloud-direct (no offline queue). Ours adds transactional safety + multi-device live sync on top of a display cache.
