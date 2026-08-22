# POS-SIMPLIFICATION-DECOMMISSION-PLAN.md
**FINAL PRODUCTION-READY VERSION**

## Objective
Poore POS system ko simplify karna hai. Naya architecture:
**Cloud (Supabase/Postgres) = SINGLE SOURCE OF TRUTH.** Har device seedha cloud se read/write karega.

### Remove
- Offline-first transaction architecture
- Local ledger as source of truth
- Background sync queue
- Reconcile loops
- Local-vs-cloud conflict engine
- Silent retry systems
- STUCK/PENDING sync states

### Target
Same data on all devices · No inventory leakage · No wallet leakage · No duplicate transactions · No silent failures · Full audit trail · Simple cloud-direct architecture · Production-safe atomic transactions.

> **IMPORTANT:** Offline-first remove karne ka matlab transaction safety remove karna NAHI hai. Cloud-direct mein bhi: Atomic transactions mandatory · Duplicate protection mandatory · Immutable audit trail mandatory · Database constraints mandatory · Concurrency protection mandatory.

---

## PART A — REMOVE
**A1. Offline-First Architecture:** Local-first write pattern, local transaction ledger as source of truth, IndexedDB/Dexie transaction storage, offline transaction queue, pending transaction retry system, STUCK transaction state, FAILED sync state, background reconciliation engine, local-vs-cloud comparison loop, complex dependency-order sync queue.
Lightweight cache allowed hai sirf UI performance ke liye. **CACHE ≠ SOURCE OF TRUTH.** Transaction hamesha cloud DB se confirm hogi.

**A2. Remove Broken/Unused Features (after audit):** Gift card/service agar unused/broken, bundle/add-on agar incomplete, duplicate sale entry systems, duplicate restock flows, broken import/export, dead tabs, old unused modules, purani offline/sync files, unused DB tables/columns.
> Working core modules blindly delete NAHI karna.

**KEEP:** Sales, Returns, Refunds, Inventory, Wallets, Expenses, Supplier ledger, Customer ledger, Credit, Users, Permissions, Reports, Product management.

---

## PART B — FINAL CORE SYSTEM
1. **Product Management** — Add/Edit/Archive-Delete. Hard delete tabhi jab koi historical transaction na ho; warna ARCHIVE/INACTIVE. Historical records kabhi break nahi honge.
2. **Restock** — Supplier ya manual stock-in. Inventory: IN. Restock transaction create hogi. Scattered `stock += qty` se update NAHI. Har restock ka ledger entry mandatory.
3. **Sale** — Inventory: OUT, Wallet: IN. Credit sale: Inventory OUT, Wallet NO MOVEMENT, Customer Ledger RECEIVABLE created.
4. **Discount** — Item-level %/fixed, Order-level %/fixed. Discount khud wallet move nahi karega — final payable reduce karega (10,000 − 1,000 = 9,000 payable, Wallet IN = 9,000). Discount ledger separately track ho sakta hai.
5. **Return** — Inventory: IN. Refund diya → Wallet OUT. Refund nahi → Wallet NO MOVEMENT. Credit adjustment → Customer Ledger update.
6. **Refund** — WITH physical return: Inventory IN, Wallet OUT. WITHOUT: Inventory NO MOVEMENT, Wallet OUT.
7. **Delete Sale** — Hard delete NAHI = REVERSE SALE. Original preserved, reversal txn: Inventory IN, Wallet OUT. Audit trail, DB row remove nahi.
8. **Delete Return** — Original preserved, reversal: Inventory OUT. Refund diya tha → Wallet IN.
9. **Edit Bill** — Direct overwrite NAHI — delta calculate. (2→1 qty → Inventory IN +1.) Payment change → wallet/credit exact delta. Audit: before/after, user, timestamp, reason, related txn.
10. **Wallets** — Cash/Bank/Card/Online. Balance = Opening + Total IN − Total OUT. Scattered increments se NAHI — ledger/controlled transaction se.
11. **Expense** — Wallet OUT. Ledger entry: amount, wallet, category, date, user, notes, reference.
12. **Supplier Ledger** — Purchase → Inventory IN. Cash payment → Wallet OUT. Credit purchase → Wallet NO MOVEMENT, Payable up. Supplier payment → Wallet OUT, outstanding down.
13. **Customer Ledger/Credit** — Credit sale: Inventory OUT, Wallet NO MOVEMENT, Receivable up. Later payment: Wallet IN, Receivable down. Har payment customer ledger txn se linked.
14. **Users + Permissions** — Admin/Manager/Cashier. Permissions DB/server-level enforce — frontend button hide security nahi. Sensitive actions (Reverse Sale, Refund, Edit Bill, Manual/Wallet Adjustment, User Mgmt) role-check ke baghair execute nahi.
15. **Reporting** — Same cloud source. Sales, Returns, Refunds, Net Sales, Discounts, Inventory, Wallet, Expenses, Supplier Outstanding, Customer Receivable, Salesman, Cashier. **Never `Math.max(0, value)`** — signed values correctly display hon.

---

## PART C — INVENTORY IN/OUT FLOW
Restock → IN · Manual Adjustment Plus → IN · Sale → OUT · Customer Return → IN · Refund With Physical Return → IN · Refund Without Physical Return → NO MOVEMENT · Reverse/Delete Sale → IN · Reverse/Delete Return → OUT · Manual Adjustment Minus → OUT · Edit Bill Item Added → OUT · Edit Bill Item Removed → IN · Supplier Purchase → IN

## PART D — WALLET IN/OUT FLOW
Sale Payment → IN (selected wallet) · Return Refund → OUT (actual refund wallet) · Refund → OUT · Reverse/Delete Sale → OUT · Reverse/Delete Return Refund → IN · Credit Sale → NO MOVEMENT (receivable) · Customer Credit Receiving → IN · Expense → OUT · Supplier Payment → OUT · Supplier Credit Purchase → NO MOVEMENT (payable) · Wallet Transfer → Source OUT + Destination IN (same atomic txn, never one-sided) · Discount → NO DIRECT MOVEMENT (reduces payable)

## PART E — GOLDEN LEDGER RULE
Har business action ka immutable transaction record. Kabhi UPDATE old ledger amount ya DELETE old ledger row NAHI. Correction = NEW REVERSAL/ADJUSTMENT ENTRY.

## PART F — CLOUD-DIRECT ARCHITECTURE
User Action → Frontend Validation → Server/RPC Call → Auth + Permission Check → Duplicate Request Check → DB Transaction Start → Business Validation → Main Transaction → Inventory Ledger → Wallet Ledger → Customer/Supplier Ledger (if needed) → Commit All Together → Return Confirmed Result → Frontend Refresh from Cloud Response.
Koi step fail → **ROLLBACK ENTIRE TRANSACTION.** Partial save NAHI.

## PART G — ATOMIC RPC RULE
Required functions: `create_sale`, `create_return`, `create_refund`, `reverse_sale`, `reverse_return`, `restock_inventory`, `adjust_inventory`, `transfer_wallet`, `create_expense`, `supplier_payment`, `customer_payment`, `edit_sale`.
Frontend independent multi-query (insert → inventory → wallet) NAHI karega. Either ALL SUCCESS or ALL ROLLBACK.

## PART H — DUPLICATE ACTION PROTECTION
Har critical action ke paas `request_id`/idempotency_key. Same request ID dobara process nahi — existing successful transaction return karo. Sync-queue machinery remove ho sakti hai, lekin duplicate cloud request protection rehni chahiye.

## PART I — CONCURRENCY PROTECTION
DB-level transaction/locking/constraint ensure kare final stock invalid negative na ho. check + reserve/deduct atomically + create sale — same transaction. Frontend stock check trusted nahi — Database final authority.

## PART J — NEGATIVE STOCK POLICY
Default: Negative stock NOT allowed → DB reject ("Insufficient stock."). Intentional allow → separate explicit setting + permission.

## PART K — DATABASE SOURCE OF TRUTH
Cloud DB: Product master, Inventory ledger, Wallet ledger, Sale records, Sale items, Return, Refund, Customer ledger, Supplier ledger, Expense ledger, Audit log, Reversal links, Users, Roles, Permissions. Local cache display-only. Transaction validation hamesha cloud.

## PART L — INVENTORY BALANCE
Balance = Opening + Stock IN − Stock OUT (ledger-derived). Cached `current_stock` ho to frontend direct update NAHI — sirf atomic txn/trigger/RPC. Periodic reconciliation diff must = 0.

## PART M — WALLET BALANCE
Opening + Total IN − Total OUT. Cached field frontend direct update NAHI. Wallet transfer: Source OUT + Destination IN same transaction mandatory.

## PART N — REVERSAL RULE
Hard delete forbidden for financial/inventory history. Every reversal: original ref, reversal ID, user, timestamp, reason, exact opposite ledger effect. Double reversal prevent mandatory.

## PART O — AUDIT LOG
Sensitive: Sale, Return, Refund, Reverse, Edit Bill, Inventory/Wallet Adjustment, Expense, Supplier Payment, Customer Payment, User Permission Change. Store: action, entity type/ID, user ID, timestamp, before/after, reason, request ID. Immutable.

## PART P — PAYMENT VALIDATION
Final Payable = Gross − Discount ± adjustments. Split payment total validate. Paid < payable → remaining = Customer receivable. Wallet sirf actual paid amounts se move.

## PART Q — RETURN / REFUND SEPARATION
Return = Item movement. Refund = Money movement. Cases: (1) returned+refunded, (2) returned+store credit, (3) returned+refund pending, (4) refund without return. Har case separately record.

## PART R — EDIT BILL RULE
Original Bill → Exact Difference → Inventory Delta → Wallet Delta → Customer Credit Delta (if needed) → Audit Version → Commit Atomically. No scattered frontend plus/minus.

## PART S — API / RPC SECURITY
Critical RPC checks: authenticated user, active user, role permission, input validation, duplicate request validation, related transaction validation, stock validation, wallet validation, atomic commit, audit entry. Frontend data trusted NAHI.

## PART T — ERROR HANDLING
Fail → UI clearly: "Transaction save nahi hui. Dobara try karein." Silently local transaction NAHI. Timeout → blindly naya transaction NAHI — same request_id se status check.

## PART U — MULTI-DEVICE FLOW
All devices → Cloud → same source of truth. Realtime stable ho to use; warna refresh/poll. Transaction correctness realtime par depend NAHI. DB commit final authority.

## PART V — SAFE MIGRATION ORDER
1. Complete database backup.
2. Complete code backup / git branch / release tag.
3. Current modules audit — KEEP / REMOVE / REBUILD / MIGRATE list.
4. New atomic cloud RPC functions build.
5. Duplicate request protection add.
6. Immutable ledger + reversal rules implement.
7. Inventory & wallet validation add.
8. Frontend → new cloud RPC architecture migrate.
9. End-to-end testing.
10. Multi-device concurrency testing.
11. Duplicate click / timeout / retry testing.
12. **Only after successful verification:** remove old offline queue, local ledger, reconcile loop, sync status, dead code.
13. Regression testing.

## PART W — REQUIRED TEST CASES
Normal Sale · Multi-item Sale · Discount Sale · Split Payment · Full Credit Sale · Partial Credit Sale · Customer Credit Receiving · Return with Refund · Return without Refund · Refund with Physical Return · Refund without Physical Return · Reverse Sale · Reverse Return · Restock · Manual Stock Plus · Manual Stock Minus · Edit Bill Add Item · Edit Bill Remove Item · Expense · Supplier Cash Purchase · Supplier Credit Purchase · Supplier Payment · Wallet Transfer · Duplicate Click · Request Timeout · Retry Same Request · Two Devices Same Product Sale · Insufficient Stock · Permission Denied Action · Blocked User Action · Reversal Twice Attempt · Partial Database Failure Simulation · Reports Negative Values · Inventory Ledger Diff=0 · Wallet Ledger Diff=0 · Multi-device Data Match

---

## FINAL ACCEPTANCE CRITERIA
Cloud single source of truth · No local transaction source of truth · Every critical action atomic RPC/DB transaction · No partial transaction · Duplicate requests cannot duplicate · Historical financial/inventory immutable · Delete = controlled reversal · Every reversal linked to original · Double reversal prevented · Inventory IN/OUT rules always followed · Wallet IN/OUT rules always followed · Credit sale moves inventory not wallet · Customer payment moves wallet, reduces receivable · Supplier credit purchase moves inventory not wallet · Supplier payment moves wallet, reduces payable · Wallet transfer atomic double-entry · Return/Refund separately handled · Edit bill exact delta only · Concurrent devices cannot corrupt stock · Negative stock explicit policy · Permissions server-side · Audit logs for sensitive actions · Reports real signed values · No silent failures · No hidden local-only transactions · Inventory balance matches ledger · Wallet balance matches ledger · Reconciliation diff=0 · Same confirmed cloud data on all devices · Full regression tests pass.

## FINAL GOLDEN RULE
EVERY BUSINESS ACTION: Validate → Check Permission → Check Duplicate Request → Run One Atomic Database Transaction → Create Immutable Ledger Entries → Update Controlled Balances → Create Audit Record → Commit All → Return Confirmed Cloud Result.
**IF ANY STEP FAILS: ROLLBACK EVERYTHING. NO PARTIAL SAVE. NO SILENT LOCAL SAVE. NO DUPLICATE TRANSACTION. NO HARD DELETE OF HISTORY. NO INVENTORY OR WALLET LEAKAGE.**

FINAL ARCHITECTURE: CLOUD-DIRECT + ATOMIC TRANSACTIONS + IMMUTABLE LEDGERS + REVERSAL-BASED CORRECTIONS + DUPLICATE PROTECTION + DATABASE-LEVEL CONCURRENCY CONTROL + SERVER-SIDE PERMISSIONS + FULL AUDIT TRAIL = SIMPLE + SAFE + MULTI-DEVICE + PRODUCTION-READY POS.
