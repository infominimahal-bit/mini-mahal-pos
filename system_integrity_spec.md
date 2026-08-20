# 🏗️ SYSTEM INTEGRITY SPECIFICATION — Zaynahs POS

> This document defines EXACTLY how every system must behave.
> Any deviation from this spec = BUG.
> Use this as the test oracle for the entire project.

---

## 📜 CORE PRINCIPLE

**10,000% Accuracy.** Not 99.9%. Not "close enough."

A product starts at 100 stock. After ALL possible operations (sell, return, refund, edit, adjust, restock, delete) — if all bills are deleted and adjustments reversed — stock must return to **exactly 100**. Not 99. Not 101.

Same rule for payments. Same rule for customer balances. Same rule for supplier ledgers.

---

# ══════════════════════════════════════════════
# SECTION 1: STOCK (INVENTORY) INTEGRITY
# ══════════════════════════════════════════════

## 1.1 — The ONE Rule

> `products.stock` on cloud **MUST ALWAYS** equal `SUM(stock_history.change_qty)` for that product.

If these two numbers differ by even 1 — the system is BROKEN.

## 1.2 — All Stock IN Points (stock increases)

| # | Action | How | stock_history.type | change_qty |
|---|--------|-----|-------------------|------------|
| 1 | **Product created** | Initial stock set on creation | `stock_in` | +initial_qty |
| 2 | **Restock/Purchase** | `purchaseRecordsService.create()` | `stock_in` | +qty |
| 3 | **Return from sale** | `saleReturn.ts` → per-item return | `return` | +returned_qty |
| 4 | **Bill delete** | `saleDelete.ts` → restore sale stock | `return` | +sold_qty minus already_returned |
| 5 | **Bill edit (old reversed)** | `edit_sale_atomic` RPC | `return` | +old_sale_qty |
| 6 | **Stock adjust (+)** | Manual positive adjustment | `stock_in` | +adjustment_qty |

## 1.3 — All Stock OUT Points (stock decreases)

| # | Action | How | stock_history.type | change_qty |
|---|--------|-----|-------------------|------------|
| 1 | **Normal sale** | `saleCreate.stock.ts` | `sale` | -sold_qty |
| 2 | **Sale addons** | `saleCreate.stock.ts` | `sale` | -addon_qty per addon |
| 3 | **Free gifts** | `saleCreate.stock.ts` | `sale` | -gift_qty per gift |
| 4 | **Bill edit (new sale)** | `edit_sale_atomic` RPC | `sale` | -new_sale_qty |
| 5 | **Stock adjust (-)** | Manual negative adjustment | `adjustment_out` | -adjustment_qty |

## 1.4 — Stock Rules (ABSOLUTE, NO EXCEPTIONS)

1. **Cloud products.stock is ONLY written by DB trigger** `trigger_update_product_stock` which fires on `stock_history` INSERT
2. **Frontend NEVER writes `products.stock` to cloud** — always `delete remotePayload.stock`
3. **Frontend DOES write local Dexie `products.stock`** for instant UI (optimistic update)
4. **Cloud realtime subscription ALWAYS overwrites local stock** — no guards, no `isPendingChange`
5. **CloudPull product fetch ALWAYS overwrites local stock** — cloud is truth
6. **Draft sales (status=pending) NEVER touch stock** — they are saved carts only
7. **Delete sale stock restoration is IDEMPOTENT** — checks already-returned qty from `stock_history` before restoring, so a sale that was partially refunded then deleted only restores the un-refunded portion
8. **Variant products** have separate `variant_stock_history` table with same trigger pattern

## 1.5 — The Golden Test (MUST pass after every change)

```
START: Product stock = 100
 1. Sell 10     → stock = 90   | stock_history: -10 (sale)
 2. Return 3    → stock = 93   | stock_history: +3 (return)
 3. Restock 20  → stock = 113  | stock_history: +20 (stock_in)
 4. Adjust -5   → stock = 108  | stock_history: -5 (adjustment_out)
 5. Adjust +2   → stock = 110  | stock_history: +2 (stock_in)
 6. Sell 15     → stock = 95   | stock_history: -15 (sale)
 7. Refund 5    → stock = 100  | stock_history: +5 (return)
 8. Edit bill 6 (15→10) → stock = 105 | stock_history: +15 (return old), -10 (sale new)
 9. Delete bill 8 (10 units) → stock = 115 | stock_history: +10 (return)
10. Delete bill 1 (10 sold, 3 returned → net 7) → stock = 122 | stock_history: +7 (return)
11. Delete all remaining → stock = 100 + 20 + 2 - 5 = 117

VERIFICATION SQL:
SELECT p.stock, SUM(h.change_qty) as ledger_stock
FROM products p
LEFT JOIN stock_history h ON h.product_id = p.id
WHERE p.id = '<PRODUCT_ID>'
GROUP BY p.stock;

-- p.stock MUST equal ledger_stock. ZERO difference.
```

---

# ══════════════════════════════════════════════
# SECTION 2: PAYMENT (WALLET) INTEGRITY
# ══════════════════════════════════════════════

## 2.1 — The ONE Rule

> Every wallet's `payment_modes.balance` **MUST ALWAYS** equal `SUM(payment_movements.delta)` for that wallet.

## 2.2 — All Payment IN Points (wallet balance increases)

| # | Action | Wallet | delta |
|---|--------|--------|-------|
| 1 | **Normal sale (cash)** | `cash` | +sale_total |
| 2 | **Normal sale (card)** | `card` | +sale_total |
| 3 | **Split sale** | Each wallet | +split_amount per method |
| 4 | **Bill edit (new sale applied)** | New method wallet | +new_total |
| 5 | **Expense deleted** | Original method wallet | +expense_amount (reversed) |
| 6 | **Expense updated (old reversed)** | Old method wallet | +old_amount |

## 2.3 — All Payment OUT Points (wallet balance decreases)

| # | Action | Wallet | delta |
|---|--------|--------|-------|
| 1 | **Sale deleted** | Sale's method wallet | -remaining_total (refund-aware ratio) |
| 2 | **Sale refunded** | Sale's method wallet | -refund_amount (proportional ratio) |
| 3 | **Bill edit (old sale reversed)** | Old method wallet | -old_total (refund-aware ratio) |
| 4 | **New expense** | Expense method wallet | -expense_amount |
| 5 | **Expense updated (new applied)** | New method wallet | -new_amount |

## 2.4 — Payment Rules

1. **Split payments** → each method gets its own `payment_movements` entry with correct delta
2. **Delete sale** → reverse uses `delRatio = (total - refundedAmount) / total` so already-refunded portion is not reversed twice
3. **Bill edit** → old sale wallet reversed THEN new sale wallet applied (2 separate calls)
4. **Expense** → create = money OUT, delete = money IN (reverse), update = reverse old + apply new
5. **Draft sales** → NO payment movement (they are not real sales yet)
6. **Normalization** → `digital`, `wallet` → `online` method (via `normalizePaymentMethod`)

## 2.5 — Payment Test Scenario

```
START: Cash wallet = 0, Card wallet = 0

 1. Sale 1000 on Cash       → Cash = 1000, Card = 0
 2. Sale 500 on Card        → Cash = 1000, Card = 500
 3. Sale 800 split (500 Cash + 300 Card) → Cash = 1500, Card = 800
 4. Expense 200 from Cash   → Cash = 1300, Card = 800
 5. Refund sale #2 (500)    → Cash = 1300, Card = 300
 6. Edit sale #1 (change from Cash to Card, same 1000) → Cash = 300, Card = 1300
 7. Delete sale #3           → Cash = -200, Card = 1000
 8. Delete expense #4        → Cash = 0, Card = 1000
 9. Delete sale #6           → Cash = 0, Card = 0

VERIFICATION SQL:
SELECT pm.id, pm.balance, COALESCE(SUM(pmv.delta), 0) as ledger_balance
FROM payment_modes pm
LEFT JOIN payment_movements pmv ON pmv.mode_id = pm.id
GROUP BY pm.id, pm.balance;

-- pm.balance MUST equal ledger_balance for every mode.
```

---

# ══════════════════════════════════════════════
# SECTION 3: CUSTOMER STATS & LEDGER INTEGRITY
# ══════════════════════════════════════════════

## 3.1 — The ONE Rule

> Customer `total_purchases` must equal the SUM of all completed sales for that customer, minus refunds/deletions.
> Customer `balance` must equal SUM of `customer_ledger` entries (debits - credits).

## 3.2 — Customer Stats Update Points

| # | Action | Frontend | DB Trigger | Net Effect |
|---|--------|----------|------------|------------|
| 1 | **New sale** | `totalPurchases += total` locally | `total_purchases += total` on cloud | See §3.3 |
| 2 | **Sale delete** | `totalPurchases -= remainingTotal` | NO trigger (DELETE doesn't fire) | Frontend only |
| 3 | **Refund** | `totalPurchases -= refundAmount` | NO trigger (status changes to 'refunded') | Frontend only |
| 4 | **Bill edit** | `totalPurchases = totalPurchases - oldNet + newTotal` | Trigger fires on new sale INSERT | See §3.3 |
| 5 | **Draft sale** | SKIPPED | Trigger has `status = 'completed'` guard | Correct |

## 3.3 — ⚠️ KNOWN ISSUE: Double-Count Risk

The DB trigger `update_customer_stats` fires on INSERT/UPDATE of sales with `status = 'completed'`.
The frontend ALSO increments `totalPurchases` locally and syncs via queueOp UPSERT.

**Single device:** Usually safe because UPSERT overwrites the trigger value with the same number.
**Multi device:** RACE CONDITION — Device A's UPSERT can overwrite Device B's trigger increment, or vice versa. Customer stats can drift.

**REQUIRED FIX:** Choose ONE source of truth:
- **Option A (Recommended):** Remove the DB trigger. Let frontend be the ONLY source. Customer stats are display-only, not financial.
- **Option B:** Remove frontend stats update. Let trigger be the ONLY source. But then DELETE/REFUND reversals must also be trigger-based.

## 3.4 — Customer Ledger

| Action | Ledger Type | Amount |
|--------|-------------|--------|
| New sale | `sale` / `debit` | sale.total |
| Sale delete | `refund` / `credit` | remaining_total |
| Refund | `refund` / `credit` | refund_amount |
| Bill edit (reverse old) | `refund` / `credit` | old_net |
| Bill edit (new sale) | `debit` | new_total |
| Manual payment | `payment` / `credit` | payment_amount |

---

# ══════════════════════════════════════════════
# SECTION 4: SUPPLIER SYSTEM INTEGRITY
# ══════════════════════════════════════════════

## 4.1 — Supplier Ledger

| Action | Type | Credit (owes more) | Debit (paid) |
|--------|------|-------------------|--------------|
| Purchase/Stock IN | `purchase` | +amount | - |
| Opening balance | `opening_balance` | +amount | - |
| Payment to supplier | `payment` | - | +amount |
| Expense delete (linked) | DELETE transaction | Removed | Removed |

## 4.2 — ⚠️ KNOWN ISSUE: Supplier Payment Doesn't Affect Wallets

When you pay a supplier (e.g., PKR 50,000 from cash register), the `recordPayment()` function creates a `supplier_transaction` but does NOT call `adjustPaymentBalances()`.

**Impact:** Cash register shows MORE money than reality.

**REQUIRED FIX:** Add wallet deduction in `suppliersService.recordPayment()`:
```typescript
await adjustPaymentBalances([{
  id: generateId(),
  modeId: normalizePaymentMethod(data.payment_type || 'cash'),
  delta: -data.amount,
  referenceId: id,
  note: `Supplier payment: ${data.note || ''}`,
}]);
```

---

# ══════════════════════════════════════════════
# SECTION 5: OFFLINE / SYNC / MULTI-DEVICE
# ══════════════════════════════════════════════

## 5.1 — Sync Rules

1. **All operations queue in `pendingOps`** when offline
2. **SyncEngine retries** with exponential backoff when online
3. **Every sale has `idempotency_key = sale.id`** → retry = no-op on cloud
4. **Delete wins** — tombstone system prevents resurrection
5. **Financial ops never silently dropped** — marked as `error` for review
6. **Product stock: cloud ALWAYS wins** — no `isPendingChange` guard

## 5.2 — Offline Bill Edit

When offline, `editSaleAtomic()` falls back to 2-step:
1. `createSale(newSale)` — queued
2. `deleteSale(oldSale)` — queued

**Risk:** If device loses connection between steps, old sale stays. SyncEngine will eventually push both. **Idempotency key prevents real damage.** Risk level: LOW.

## 5.3 — Multi-Device Sync

All entities except `products.stock` use **last-write-wins** UPSERT.
`products.stock` is exclusively managed by the DB trigger on `stock_history` INSERT — so multi-device stock is ALWAYS correct because every device writes to `stock_history`, never to `products.stock` directly.

---

# ══════════════════════════════════════════════
# SECTION 6: PERMISSIONS & ROLES
# ══════════════════════════════════════════════

## 6.1 — Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to everything |
| `manager` | Everything except user management, settings write |
| `cashier` | POS, transactions (own), limited reports |
| `salesman` | POS only |

## 6.2 — Permission Matrix

| Permission | Admin | Manager | Cashier | Salesman |
|------------|-------|---------|---------|----------|
| `view_pos` | ✅ | ✅ | ✅ | ✅ |
| `view_dashboard` | ✅ | ✅ | ❌ | ❌ |
| `view_transactions` | ✅ | ✅ | ✅ | ❌ |
| `view_reports` | ✅ | ✅ | ❌ | ❌ |
| `view_inventory` | ✅ | ✅ | ✅ | ❌ |
| `manage_products` | ✅ | ✅ | ❌ | ❌ |
| `manage_stock` | ✅ | ✅ | ❌ | ❌ |
| `view_suppliers` | ✅ | ✅ | ❌ | ❌ |
| `view_expenses` | ✅ | ✅ | ❌ | ❌ |
| `view_discounts` | ✅ | ✅ | ❌ | ❌ |
| `view_customers` | ✅ | ✅ | ✅ | ❌ |
| `view_settings` | ✅ | ✅ | ❌ | ❌ |
| `view_users` | ✅ | ❌ | ❌ | ❌ |
| `manage_users` | ✅ | ❌ | ❌ | ❌ |
| `edit_price` | ✅ | ✅ | ❌ | ❌ |
| `give_discount` | ✅ | ✅ | Per-user | ❌ |
| `delete_sale` | ✅ | ✅ | ❌ | ❌ |
| `refund_sale` | ✅ | ✅ | Per-user | ❌ |
| `export_database` | ✅ | ❌ | ❌ | ❌ |
| `view_profit` | ✅ | ✅ | ❌ | ❌ |

## 6.3 — Enforcement Layers

1. **App layer** — `RequireAccess` route guard + boolean flags (UX feedback)
2. **Server layer** — RPC role guards in `delete_sale_atomic`, `refund_sale_atomic` (cannot bypass)
3. **Session** — 24hr expiry, network error ≠ sign out

---

# ══════════════════════════════════════════════
# SECTION 7: ALL OTHER MODULES
# ══════════════════════════════════════════════

## 7.1 — Reports
- All reports query **Supabase directly** with date filters
- NEVER calculate totals from in-memory `state.sales`
- Use `fetchAllPages()` — no `.limit()` on financial queries
- Sales, Expenses, Customers, Financial, Inventory, Suppliers, Salesmen reports

## 7.2 — Discount System
- Bill-level discounts (flat/percentage)
- Item-level discounts
- Mix & Match builder (buy X get Y)
- Free gift stock deduction (tracked in `saleCreate.stock.ts`)

## 7.3 — Barcode System
- Auto-generate barcodes via `seedMissingBarcodes()`
- Camera scanner via `html5-qrcode`
- Hardware scanner support (USB/Bluetooth)
- Print layouts: A4, Thermal 50x25, 40x30, 80x40

## 7.4 — Receipt System
- QR code on receipt (invoice number)
- Multiple receipt layouts (A4, Thermal)
- Print via `react-to-print`
- WhatsApp share option
- Configurable receipt fields (show/hide logo, QR, barcode, etc.)

## 7.5 — Expense System
- CRUD with wallet integration
- Linked to supplier transactions when type = "Supplies"
- Delete reverses wallet AND linked supplier transaction
- Update reverses old wallet + applies new

## 7.6 — Export/Backup
- Full database export (JSON)
- Excel export per-entity
- PDF generation (jspdf)
- Selective table backup/restore

## 7.7 — Dashboard
- Stats cards (sales, revenue, expenses, profit)
- Charts via Recharts
- Today's summary

## 7.8 — Multi-Tab Cart (Sales Tabs)
- Multiple concurrent carts
- Switch between tabs without losing items
- Zustand-managed state

---

# ══════════════════════════════════════════════
# SECTION 8: CRITICAL BUGS FOUND
# ══════════════════════════════════════════════

## BUG #1 — Supplier Payment Doesn't Deduct Wallet 🔴 P0

**Impact:** Cash register balance shows MORE money than reality after paying supplier.

**Location:** `src/lib/services/suppliersService.ts` → `recordPayment()`

**Fix:** Add `adjustPaymentBalances()` call with negative delta.

---

## BUG #2 — Customer Stats Multi-Device Race 🔴 P0

**Impact:** Customer `total_purchases` can drift on multi-device setups because both frontend UPSERT and DB trigger write to the same field.

**Location:**
- Frontend: `src/lib/services/saleCreate.ts` line 71
- DB: `update_customer_stats` trigger in `SUPER_MASTER_SCHEMA.sql`

**Fix:** Remove the DB trigger `update_customer_stats` (frontend is the authoritative source for display stats). OR remove frontend stats update and make trigger handle DELETE/REFUND too.

---

## BUG #3 — `view_online_orders` Permission Dead Code 🟢 P2

**Impact:** Estore removed but permission still defined.

**Location:** `src/lib/permissions.ts`

**Fix:** Remove `view_online_orders` from Permission type and all role maps.

---

## BUG #4 — `canEditSale` Uses `edit_price` Permission 🟡 P1

**Impact:** Anyone with edit price permission can also edit sales — may not be intended.

**Location:** `src/context/authProfile.ts` line 50

**Fix:** Use dedicated `edit_sale` permission or rename.

---

## BUG #5 — Expense Linked Supplier Balance Not Recalculated 🟡 P1

**Impact:** When expense is deleted, linked `supplier_transaction` is deleted but supplier running balance isn't immediately recalculated.

**Location:** `src/lib/services/expensesService.ts` → `delete()`

**Fix:** After deleting the linked transaction, trigger supplier balance recalculation.

---

# ══════════════════════════════════════════════
# SECTION 9: VERIFICATION QUERIES
# ══════════════════════════════════════════════

```sql
-- I1: Stock integrity — products.stock vs stock_history ledger
SELECT p.id, p.name, p.stock as actual,
       COALESCE(SUM(h.change_qty), 0) as ledger,
       p.stock - COALESCE(SUM(h.change_qty), 0) as drift
FROM products p
LEFT JOIN stock_history h ON h.product_id = p.id
GROUP BY p.id, p.name, p.stock
HAVING p.stock != COALESCE(SUM(h.change_qty), 0);

-- I2: Wallet integrity — payment_modes.balance vs payment_movements
SELECT pm.id, pm.name, pm.balance as actual,
       COALESCE(SUM(pmv.delta), 0) as ledger,
       pm.balance - COALESCE(SUM(pmv.delta), 0) as drift
FROM payment_modes pm
LEFT JOIN payment_movements pmv ON pmv.mode_id = pm.id
GROUP BY pm.id, pm.name, pm.balance
HAVING pm.balance != COALESCE(SUM(pmv.delta), 0);

-- I3: Customer balance vs ledger
SELECT c.id, c.name, c.balance as actual,
       COALESCE(SUM(cl.debit), 0) - COALESCE(SUM(cl.credit), 0) as ledger,
       c.balance - (COALESCE(SUM(cl.debit), 0) - COALESCE(SUM(cl.credit), 0)) as drift
FROM customers c
LEFT JOIN customer_ledger cl ON cl.customer_id = c.id
GROUP BY c.id, c.name, c.balance
HAVING c.balance != COALESCE(SUM(cl.debit), 0) - COALESCE(SUM(cl.credit), 0);
```
