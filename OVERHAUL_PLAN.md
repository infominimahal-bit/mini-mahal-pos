# 🔧 SYSTEM OVERHAUL — MASTER EXECUTION PLAN

> **Yeh document itna detailed hai ke koi bhi AI agent (DeepSeek, Flash, OpenCode, Gemini, Claude, etc.) isse phase-by-phase execute kar sake bina kuch puche.**
> Har phase self-contained hai. Har phase ke end mein success criteria diye hain.
> **PHASE ORDER MATTER KARTA HAI** — dependency map end mein hai.

---

# 🎯 THE GOLDEN RULE — 10000% STOCK ACCURACY

**This is the #1 requirement. Everything else is secondary. If stock drifts by even 1 unit — STOP AND FIX.**

### The Test Scenario (run after ALL phases):
1. Add product, stock = **100**
2. Sell 10 → stock = 90
3. Return 3 from that sale → stock = 93
4. Restock (purchase) 20 → stock = 113
5. Stock adjustment -5 (damaged) → stock = 108
6. Stock adjustment +2 (found) → stock = 110
7. Sell 15 → stock = 95
8. Refund 5 from sale → stock = 100
9. Edit bill (qty 15→10) → stock = 105
10. Delete edited bill → stock = 115
11. Delete first bill (sold 10, returned 3 = net 7 deducted, restore 7) → stock = 122
12. Delete all remaining → stock = **100 + 20 + 2 - 5 = 117**

**AT EVERY STEP** — `products.stock` in Supabase MUST EXACTLY match `SUM(stock_history.change_qty)` for that product. Zero drift.

### Audit Query (run after EVERY phase):
```sql
SELECT p.name, p.stock, COALESCE(SUM(sh.change_qty),0) AS ledger,
       p.stock - COALESCE(SUM(sh.change_qty),0) AS drift
FROM products p LEFT JOIN stock_history sh ON sh.product_id = p.id
WHERE p.track_inventory = true
GROUP BY p.id, p.name, p.stock
HAVING p.stock != COALESCE(SUM(sh.change_qty),0);
```
**Must return 0 rows.**

### Stock Rules:
- **Cloud DB = ONLY truth** for `products.stock`
- Stock changes ONLY via `stock_history` inserts → DB trigger auto-updates
- **NEVER write `products.stock` directly from frontend**
- Realtime product updates from cloud ALWAYS overwrite local
- Bill edit = ONE atomic RPC, not two calls
- Every operation has `idempotency_key`
- `isPendingChange` guard REMOVED for products

---

# PHASE 1: SPLIT `services.ts` (4884 lines → 15 files)

## What
`src/lib/services.ts` is a 4884-line god file containing 20+ service objects, 30+ mapper functions, and all business logic. Split it into separate files.

## Target Structure
```
src/lib/services/
├── index.ts              ← barrel re-export (ALL existing imports keep working)
├── mappers.ts            ← ALL mapX() and toRemoteX() functions
├── utils.ts              ← generateId, fetchAllPages, getDeviceId, normalizePaymentMethod, derivePaymentStatus, getAmountByMethod
├── atomicOps.ts          ← commitSaleAuthoritative, applyStockMovementsRemote, deleteSaleAtomic, refundSaleAtomic, revertLocalSaleStock
├── salesService.ts       ← salesService object + returnSale logic
├── productsService.ts    ← productsService object
├── customersService.ts   ← customersService + recordCustomerLedger + toRemoteCustomerLedger
├── inventoryService.ts   ← purchaseRecordsService + stockHistoryService + variantStockHistoryService + applyVariantStockMovement
├── suppliersService.ts   ← suppliersService + supplierTransactionsService
├── expensesService.ts    ← expensesService
├── settingsService.ts    ← settingsService + mapSettings + toRemoteSettings (huge mapping block)
├── categoriesService.ts  ← categoriesService + discountsService
├── ordersService.ts      ← storeOrdersService + salesTabsService + mapStoreOrder + toRemoteStoreOrder + toRemoteSalesTab
├── bundlesService.ts     ← bundlesService + toppingsService + productToppingsService + productAddonsService + mapBundle + mapTopping etc.
├── paymentsService.ts    ← paymentModesService + adjustPaymentBalances + buildSalePaymentMoves + buildReversePaymentMoves + seedPaymentModes + getPaymentModes + mapPayment + toRemotePayment + mapPaymentMode + toRemotePaymentMode + DEFAULT_PAYMENT_MODES
└── usersService.ts       ← usersService + salesmenService + seedMissingBarcodes
```

## Exact Steps

### Step 1.1: Create the folder
```bash
mkdir -p src/lib/services
```

### Step 1.2: Create `mappers.ts`
Move ALL functions that start with `map` or `toRemote` from `services.ts`:
- `mapProduct`, `mapSalesman`, `mapCustomer`, `mapSale`, `mapUser`, `mapExpense`, `mapStockHistory`, `mapVariantStockHistory`, `mapProductAddon`, `mapDiscount`, `mapPurchaseRecord`, `mapCategory`, `mapSupplier`, `mapStoreOrder`, `mapPayment`, `mapPaymentMode`, `mapBundle`, `mapTopping`
- `toRemoteProduct`, `toRemoteCustomer`, `toRemoteSupplier`, `toRemoteExpense`, `toRemoteSupplierTransaction`, `toRemotePurchaseRecord`, `toRemoteSale`, `toRemoteStockHistory`, `toRemoteVariantStockHistory`, `toRemoteProductAddon`, `toRemotePayment`, `toRemotePaymentMode`, `toRemoteCustomerLedger`, `toRemoteStoreOrder`, `toRemoteSalesTab`, `toRemoteTopping`

Each function keeps exact same signature. Import types from `../../types`.

### Step 1.3: Create `utils.ts`
Move: `generateId` (re-export from localDb), `fetchAllPages`, `getDeviceId`, `normalizePaymentMethod`, `getAmountByMethod`, `derivePaymentStatus`, `generateNextInvoiceNumber`, `getNextInvoiceNumber`, `generateBarcodeValue` import.

### Step 1.4: Create `atomicOps.ts`
Move: `commitSaleAuthoritative`, `revertLocalSaleStock`, `applyStockMovementsRemote`, `deleteSaleAtomic`, `refundSaleAtomic` + the `activeReturns` Set mutex.
Import: `supabase` from `../supabase`, `localDb` from `../localDb`, `signAction` from `../actionToken`.

### Step 1.5: Create each service file
For each service (`salesService`, `productsService`, etc.):
1. Copy the service object + any helper functions it uses internally
2. Import what it needs from `./mappers`, `./utils`, `./atomicOps`
3. Import `localDb`, `queueOp`, `generateId` from `../localDb`
4. Import `supabase` from `../supabase`
5. Export the service object

**salesService.ts** is the BIGGEST — it contains `salesService.create` (~300 lines), `salesService.delete` (~250 lines), `returnSale` (~300 lines). This single file may be ~900 lines — that's OK for now (Phase 7 will simplify it).

**settingsService.ts** — includes `mapSettings` (~150 lines) and `toRemoteSettings` (~150 lines) which are massive mapping blocks. Keep them together with `settingsService`.

### Step 1.6: Create `index.ts` barrel
```typescript
export * from './mappers';
export * from './utils';
export * from './atomicOps';
export * from './salesService';
export * from './productsService';
export * from './customersService';
export * from './inventoryService';
export * from './suppliersService';
export * from './expensesService';
export * from './settingsService';
export * from './categoriesService';
export * from './ordersService';
export * from './bundlesService';
export * from './paymentsService';
export * from './usersService';
```

### Step 1.7: Delete old file
```bash
rm src/lib/services.ts
```

### Step 1.8: Verify
```bash
npm run build
```
MUST pass with zero errors. All imports like `import { salesService } from '../../lib/services'` will resolve via `src/lib/services/index.ts`.

Also run:
```bash
grep -rn "from.*lib/services" src/ | grep -v "node_modules" | head -40
```
To verify all imports still resolve.

## Success Criteria
- [ ] `src/lib/services.ts` does NOT exist
- [ ] `src/lib/services/index.ts` exists and re-exports everything
- [ ] Every file in `src/lib/services/` is clearly focused on one domain
- [ ] `npm run build` passes with zero errors
- [ ] App runs exactly the same — no behavior change

---

# PHASE 2: REPLACE useReducer WITH ZUSTAND STORES (106 cases → separate stores)

## What
`src/context/SupabaseAppContext.tsx` is 2621 lines with 106 reducer cases handling ALL app state. Replace with Zustand stores — each domain gets its own store file.

## Step 2.1: Install Zustand
```bash
npm install zustand
```

## Step 2.2: Create store files

### `src/stores/productsStore.ts`
```typescript
import { create } from 'zustand';
import { Product } from '../types';

interface ProductsState {
  products: Product[];
  setProducts: (p: Product[]) => void;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (p) => set((s) => ({ products: [...s.products, p] })),
  updateProduct: (p) => set((s) => ({
    products: s.products.map(x => x.id === p.id ? p : x)
  })),
  deleteProduct: (id) => set((s) => ({
    products: s.products.filter(x => x.id !== id)
  })),
}));
```

### Same pattern for ALL stores:
| Store file | State it manages | Reducer cases it replaces |
|-----------|-----------------|--------------------------|
| `productsStore.ts` | products[] | SET_PRODUCTS, ADD_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT |
| `salesStore.ts` | sales[] | SET_SALES, ADD_SALE, UPDATE_SALE, DELETE_SALE |
| `cartStore.ts` | cart[], notes, editingSaleId, editingStoreOrderId, heldCarts | ADD_TO_CART, REMOVE_FROM_CART, UPDATE_CART_ITEM_QTY, CLEAR_CART, SET_CART, HOLD_CART, RECOVER_CART, SET_EDITING_SALE_ID, SET_EDITING_STORE_ORDER_ID, SET_NOTES, SET_CART_CUSTOMER |
| `customersStore.ts` | customers[] | SET_CUSTOMERS, ADD_CUSTOMER, UPDATE_CUSTOMER, DELETE_CUSTOMER |
| `settingsStore.ts` | settings, loading | SET_SETTINGS, SET_LOADING |
| `inventoryStore.ts` | categories[], suppliers[], purchaseRecords[], stockHistory[], variantStockHistory[] | SET_CATEGORIES, ADD/UPDATE/DELETE_CATEGORY, SET_SUPPLIERS, ADD/UPDATE/DELETE_SUPPLIER, SET_PURCHASE_RECORDS, etc. |
| `ordersStore.ts` | storeOrders[], salesTabs[] | SET_STORE_ORDERS, ADD/UPDATE/DELETE_STORE_ORDER, SET_SALES_TABS, etc. |
| `expensesStore.ts` | expenses[] | SET_EXPENSES, ADD/UPDATE/DELETE_EXPENSE |
| `paymentsStore.ts` | payments[], paymentModes[] | SET_PAYMENTS, ADD/UPDATE/DELETE_PAYMENT, SET_PAYMENT_MODES |
| `usersStore.ts` | users[], salesmen[], profile | SET_USERS, ADD/UPDATE/DELETE_USER, SET_SALESMEN, SET_PROFILE |
| `appStore.ts` | discounts[], bundles[], addons[], toppings[], isAuthenticated, loading | SET_DISCOUNTS, SET_BUNDLES, SET_ADDONS, SET_TOPPINGS, SET_AUTHENTICATED |

### `src/stores/index.ts` — barrel
```typescript
export * from './productsStore';
export * from './salesStore';
export * from './cartStore';
// ... all stores
```

## Step 2.3: Update SupabaseAppContext.tsx
1. Remove ALL reducer cases (the entire `appReducer` function)
2. Remove `useReducer` call
3. Keep: `loadData()`, realtime subscriptions, `forceSync()`
4. In `loadData()`: replace `dispatch({ type: 'SET_PRODUCTS', payload })` with `useProductsStore.getState().setProducts(payload)`
5. In realtime handlers: replace `dispatch({ type: 'UPDATE_PRODUCT', payload })` with `useProductsStore.getState().updateProduct(payload)`
6. The `useApp()` hook now returns a slim context (just loadData, forceSync, profile)

## Step 2.4: Update ALL components
Every component that uses `const { state, dispatch } = useApp()`:
1. Replace `state.products` with `const products = useProductsStore(s => s.products)`
2. Replace `state.sales` with `const sales = useSalesStore(s => s.sales)`
3. Replace `dispatch({ type: 'ADD_TO_CART', payload })` with `useCartStore.getState().addToCart(payload)`
4. Each component only subscribes to what it needs → massive performance win

**Find all usages:**
```bash
grep -rn "useApp\|state\.\|dispatch(" src/components/ | head -50
```

## Step 2.5: Verify
```bash
npm run build  # zero errors
```
Test every page manually — behavior must be identical.

## Success Criteria
- [ ] `src/stores/` exists with 10+ store files
- [ ] `SupabaseAppContext.tsx` is under 400 lines (was 2621)
- [ ] No `useReducer` in context file
- [ ] No `case 'ADD_PRODUCT':` style reducer cases anywhere
- [ ] `npm run build` passes
- [ ] All pages work exactly the same

---

# PHASE 3: SPLIT GOD COMPONENTS (7 components → 25+ files)

## What
Split every component over 300 lines into sub-components.

## TIER 1 — GOD COMPONENTS (over 1000 lines, MUST split)

### 3a: Settings.tsx (2191 lines → 6 files)
```
src/components/settings/
├── Settings.tsx             ← Tab router only (~80 lines)
├── tabs/
│   ├── GeneralSettings.tsx  ← Shop info, business settings
│   ├── ReceiptSettings.tsx  ← Receipt config
│   ├── POSSettings.tsx      ← POS display, grid, density
│   ├── SystemSettings.tsx   ← Advanced, backup, data
│   └── SecuritySettings.tsx ← Password, users, roles
├── DatabaseTools.tsx        ← stays (will shrink after reconcile removal)
├── LogoUpload.tsx           ← stays
├── PasswordChange.tsx       ← stays
└── ReceiptPreview.tsx       ← stays (700 lines — print layout, OK)
```
**ReconciliationDashboard.tsx → DELETE entirely (Phase 5 removes reconcile system)**

### 3b: Cart.tsx (1312 lines → 4 files)
```
src/components/pos/cart/
├── index.tsx          ← Cart wrapper, customer select (~100 lines)
├── CartItemList.tsx   ← Item rows with qty edit, variant display, remove (~400 lines)
├── CartFooter.tsx     ← Totals, discount inputs, extra charges (~300 lines)
└── CartActions.tsx    ← Hold/Recover/Clear/Checkout buttons (~150 lines)
```

### 3c: ProductGrid.tsx (1314 lines → 3 files)
```
src/components/pos/grid/
├── index.tsx          ← Grid layout + category bar (~200 lines)
├── ProductCard.tsx    ← Single product card rendering (~200 lines)
└── GridControls.tsx   ← Search, density slider, view mode toggle (~150 lines)
```

### 3d: CheckoutPage.tsx (1129 lines → 3 files)
```
src/components/pos/checkout/
├── index.tsx              ← Main checkout flow + sale creation logic (~400 lines)
├── PaymentForm.tsx        ← Payment method, amount, split payments (~300 lines)
└── OrderSummary.tsx       ← Summary table, totals, notes (~200 lines)
```

### 3e: ProductDetailHub.tsx (2094 lines → 5 files)
```
src/components/inventory/product-detail/
├── index.tsx              ← Parent layout + tab navigation (~150 lines)
├── ProductOverview.tsx    ← Basic info, pricing, stock level (~300 lines)
├── ProductVariants.tsx    ← Variant CRUD, variant stock (~300 lines)
├── ProductHistory.tsx     ← Stock history timeline (~200 lines)
└── ProductMedia.tsx       ← Images, barcode display (~200 lines)
```

### 3f: BundleManager.tsx (1697 lines → 3 files)
```
src/components/inventory/bundles/
├── index.tsx          ← Bundle list + toolbar (~200 lines)
├── BundleForm.tsx     ← Create/edit bundle modal (~400 lines)
└── BundleCard.tsx     ← Individual bundle card display (~200 lines)
```

### 3g: ReportsManager.tsx (1299 lines → 3 files)
```
src/components/reports/
├── ReportsManager.tsx     ← Parent tab router only (~100 lines)
├── ReportHeader.tsx       ← Date picker, export buttons, filters (~200 lines)
└── tabs/                  ← Already exists, keep as-is
```

### 3h: InventoryManager.tsx (1216 lines → 3 files)
```
src/components/inventory/
├── InventoryManager.tsx   ← Parent with sub-tab routing (~150 lines)
├── InventoryTable.tsx     ← Product table/list view (~400 lines)
└── InventoryToolbar.tsx   ← Search, category filter, bulk actions bar (~200 lines)
```

### 3i: ProductModal.tsx (1188 lines → 3 files)
```
src/components/inventory/product-modal/
├── index.tsx              ← Modal wrapper + form submit logic (~200 lines)
├── ProductFormFields.tsx  ← Basic fields: name, price, cost, category (~300 lines)
└── ProductAdvanced.tsx    ← Variants, serial, barcode, tax settings (~300 lines)
```

### 3j: ReceiptPrint.tsx (1905 lines → 4 files)
```
src/components/pos/receipt/
├── index.tsx              ← Print trigger + layout wrapper (~100 lines)
├── ReceiptHeader.tsx      ← Shop name, address, date, invoice number (~200 lines)
├── ReceiptBody.tsx        ← Items table, quantities, prices (~300 lines)
└── ReceiptFooter.tsx      ← Totals, payment, QR, thank you note (~300 lines)
```

## TIER 2 — LARGE COMPONENTS (600-1000 lines, split into 2-3 files)

### 3l: BarcodeGenerator.tsx (996 lines → 2 files)
```
src/components/inventory/barcode/
├── index.tsx              ← Barcode page wrapper + print logic (~300 lines)
└── BarcodeCard.tsx        ← Individual barcode label rendering (~300 lines)
```

### 3m: TransactionsManager.tsx (940 lines → 3 files)
```
src/components/transactions/
├── TransactionsManager.tsx ← List + filters (~200 lines)
├── TransactionTable.tsx    ← Transaction rows/cards (~300 lines)
└── TransactionFilters.tsx  ← Date, status, search filters (~200 lines)
```

### 3n: TouchKeyboard.tsx (915 lines → 2 files)
```
src/shared/ui/
├── TouchKeyboard.tsx       ← Keyboard layout + key handling (~300 lines)
└── KeyboardLayouts.ts      ← Key layout data arrays (pure data, ~200 lines)
```

### 3o: OnlineOrdersPage.tsx → **DELETE** (estore removed in Phase 5i)

### 3p: DatabaseTools.tsx (766 lines → shrinks after reconcile removal)
After removing reconcile in Phase 5, this will naturally shrink to ~400 lines. If still >400, split:
```
src/components/settings/
├── DatabaseTools.tsx       ← Main tools page (~250 lines)
└── DataExportTools.tsx     ← Export/import/backup tools (~200 lines)
```

### 3r: PurchaseHistory.tsx (718 lines → 2 files)
```
src/components/inventory/
├── PurchaseHistory.tsx     ← List + filters (~300 lines)
└── PurchaseHistoryCard.tsx ← Individual purchase row (~200 lines)
```

### 3s: StoreSort.tsx (713 lines → 2 files)
```
src/components/inventory/
├── StoreSort.tsx           ← Sort page + drag logic (~300 lines)
└── SortableProductItem.tsx ← Individual sortable item (~200 lines)
```

### 3t: PurchaseOrderSystem.tsx (712 lines → 2 files)
```
src/components/inventory/
├── PurchaseOrderSystem.tsx ← PO list + toolbar (~300 lines)
└── PurchaseOrderForm.tsx   ← Create/edit PO form (~250 lines)
```

### 3u: InventoryReportManager.tsx (708 lines → 2 files)
```
src/components/inventory/
├── InventoryReportManager.tsx ← Report page + filters (~300 lines)
└── InventoryReportTable.tsx   ← Report data table (~250 lines)
```

### 3v: TransactionDetailModal.tsx (689 lines → 2 files)
```
src/components/transactions/
├── TransactionDetailModal.tsx ← Modal wrapper + actions (~300 lines)
└── TransactionDetails.tsx     ← Sale info, items, payment display (~250 lines)
```

### 3x: SupplierLedger.tsx (645 lines → 2 files)
```
src/components/inventory/suppliers/
├── SupplierLedger.tsx      ← Ledger page + balance calc (~300 lines)
└── LedgerEntryRow.tsx      ← Individual ledger entry (~200 lines)
```

## TIER 3 — MEDIUM COMPONENTS (400-600 lines, split only if clearly separable)

These are borderline — split only if they have clearly separable sections:

| File | Lines | Action |
|------|-------|--------|
| `POSTerminal.tsx` | 687 | Split: `POSLayout.tsx` (~200 layout/grid) + `POSHandlers.tsx` (~200 sale/scan logic) |
| `DiscountModal.tsx` | 610 | Split: `DiscountForm.tsx` (~300 form fields/conditions) |
| `SalesReport.tsx` | 567 | Split: `SalesReportTable.tsx` (~250) + `SalesReportSummary.tsx` (~150) |
| `ExpenseManager.tsx` | 563 | Split: `ExpenseTable.tsx` (~250) |
| `CustomerManager.tsx` | 547 | Split: `CustomerTable.tsx` (~250) |
| `EStoreApp.tsx` | DELETED | Estore removed in Phase 5i |
| `Header.tsx` | 524 | Split: `HeaderActions.tsx` (~200 buttons/menus) |
| `UserModal.tsx` | 515 | Split: `UserFormFields.tsx` (~250) |
| `DashboardManager.tsx` | 418 | Split: `DashboardCards.tsx` (~200 stat cards) |
| `BatchStockInSystem.tsx` | 415 | OK — single-purpose |
| `SupplierManager.tsx` | 395 | OK — borderline |
| `UserManager.tsx` | 371 | OK |
| `ProductOptionsModal.tsx` | 360 | OK |
| `CameraScanner.tsx` | 359 | OK — hardware logic |
| `SuppliersReport.tsx` | 346 | OK |
| `SyncQueueManager.tsx` | 343 | OK |
| `DiscountManager.tsx` | 300 | OK — exact limit |
| `AuditTimeline.tsx` | 311 | OK |

## TIER 4 — UTILITY FILES (non-component, also oversized)

### 3y: AuthContext.tsx (828 lines → 2 files)
```
src/context/
├── AuthContext.tsx         ← Auth state + login/logout logic (~300 lines)
└── AuthGuards.tsx          ← Role checks, permission helpers, session management (~300 lines)
```

### 3z: localDb.ts (831 lines → 2 files)
```
src/lib/
├── localDb.ts             ← Dexie schema + table definitions + queueOp (~400 lines)
└── localDbHelpers.ts      ← Helper functions, migrations, seed data (~300 lines)
```

### 3aa: translations.ts (2850 lines)
This is a PURE DATA file (translation strings). It's OK to be large IF:
- It's only key-value pairs
- No logic inside

**Action:** Leave as-is. Translations are data, not code. BUT add a comment at top:
```typescript
// This file is intentionally large — it contains all UI translation strings.
// Do NOT split into separate files — they're loaded together.
```

### 3ab: types/index.ts (725 lines → 3 files)
```
src/types/
├── index.ts               ← barrel re-export
├── product.ts             ← Product, Variant, Category, Bundle, Topping types
├── sale.ts                ← Sale, CartItem, SaleItem, Payment, Refund types
└── common.ts              ← User, Customer, Supplier, AppSettings, Expense, general types
```

### 3ac: cloudPull.ts (643 lines)
Will shrink naturally after Phase 5 (removing pending guards). Target: under 400 lines.

### 3ad: index.css (1331 lines)
Review for dead/duplicate CSS rules. Tailwind handles most styling — `index.css` should only have:
- CSS custom properties (variables)
- Print-specific styles
- Tailwind `@apply` utilities
- Animation keyframes

Remove any dead classes not used by any component. Target: under 500 lines.

## Rules for ALL splits:
- NO logic changes — only file splitting
- Props or Zustand store hooks for data access
- Each file imports from `../../shared/ui/` for UI components
- Each file under 300 lines (400 max for complex ones)
- `npm run build` must pass after EACH component split

## Success Criteria
- [ ] No component file exceeds 400 lines
- [ ] No utility file exceeds 400 lines (except translations.ts — pure data)
- [ ] All pages work exactly the same
- [ ] `npm run build` passes

---

# PHASE 4: BUILD ATOMIC DATABASE RPCs

## What
Create the missing `edit_sale_atomic` and `stock_adjustment` RPCs. These eliminate the dual-write stock leakage.

## 4a: Create `edit_sale_atomic` RPC

This is the **MOST CRITICAL** fix. Currently bill edit does TWO separate calls (create new sale + delete old sale). If either fails independently, stock leaks. This RPC does BOTH atomically.

### Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_edit_sale_atomic.sql`

```sql
CREATE OR REPLACE FUNCTION edit_sale_atomic(
  p_new_sale jsonb,
  p_new_history jsonb,
  p_old_sale_id uuid,
  p_old_reverse_history jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $$
DECLARE
  v_id uuid;
  h jsonb;
BEGIN
  -- 1. Old sale must exist
  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_old_sale_id) THEN
    RAISE EXCEPTION 'OLD_SALE_NOT_FOUND';
  END IF;

  -- 2. Idempotency check on new sale
  IF p_new_sale->>'idempotency_key' IS NOT NULL AND p_new_sale->>'idempotency_key' <> '' THEN
    IF EXISTS (SELECT 1 FROM sales WHERE idempotency_key = (p_new_sale->>'idempotency_key')::uuid) THEN
      RETURN jsonb_build_object('success', true, 'already_committed', true,
        'new_id', (SELECT id FROM sales WHERE idempotency_key = (p_new_sale->>'idempotency_key')::uuid));
    END IF;
  END IF;

  -- 3. Insert new sale (copy column list from commit_sale)
  INSERT INTO sales (
    id, invoice_number, customer_id, customer_name, customer_phone,
    items, subtotal, discount_amount, bill_discount_value, bill_discount_type,
    tax_amount, total, received_amount, change_amount, payment_method,
    card_details, status, cashier, cashier_role, receipt_number, notes,
    applied_discounts, free_gifts, timestamp, sale_date, sale_type,
    extra_charges, split_payments, refunded_amount, estore_status,
    delivery_address, delivery_fee, delivery_location_lat, delivery_location_lng,
    customer_notes, source_order_id, salesman_id, salesman_name,
    idempotency_key, edited_from_invoice, created_at, updated_at
  ) VALUES (
    (p_new_sale->>'id')::uuid,
    p_new_sale->>'invoice_number',
    NULLIF(p_new_sale->>'customer_id','')::uuid,
    p_new_sale->>'customer_name',
    p_new_sale->>'customer_phone',
    COALESCE(p_new_sale->'items','[]'::jsonb),
    (p_new_sale->>'subtotal')::numeric,
    (p_new_sale->>'discount_amount')::numeric,
    (p_new_sale->>'bill_discount_value')::numeric,
    p_new_sale->>'bill_discount_type',
    (p_new_sale->>'tax_amount')::numeric,
    (p_new_sale->>'total')::numeric,
    (p_new_sale->>'received_amount')::numeric,
    (p_new_sale->>'change_amount')::numeric,
    p_new_sale->>'payment_method',
    p_new_sale->'card_details',
    p_new_sale->>'status',
    p_new_sale->>'cashier',
    p_new_sale->>'cashier_role',
    p_new_sale->>'receipt_number',
    p_new_sale->>'notes',
    p_new_sale->'applied_discounts',
    p_new_sale->'free_gifts',
    (p_new_sale->>'timestamp')::timestamptz,
    (p_new_sale->>'sale_date')::date,
    p_new_sale->>'sale_type',
    p_new_sale->'extra_charges',
    p_new_sale->'split_payments',
    (p_new_sale->>'refunded_amount')::numeric,
    p_new_sale->>'estore_status',
    p_new_sale->>'delivery_address',
    (p_new_sale->>'delivery_fee')::numeric,
    (p_new_sale->>'delivery_location_lat')::numeric,
    (p_new_sale->>'delivery_location_lng')::numeric,
    p_new_sale->>'customer_notes',
    NULLIF(p_new_sale->>'source_order_id','')::uuid,
    NULLIF(p_new_sale->>'salesman_id','')::uuid,
    p_new_sale->>'salesman_name',
    NULLIF(p_new_sale->>'idempotency_key','')::uuid,
    p_new_sale->>'edited_from_invoice',
    COALESCE((p_new_sale->>'created_at')::timestamptz, now()),
    now()
  ) ON CONFLICT (id) DO NOTHING RETURNING id INTO v_id;

  IF v_id IS NULL THEN v_id := (p_new_sale->>'id')::uuid; END IF;

  -- 4. New sale stock movements (deductions — triggers fire)
  FOR h IN SELECT * FROM jsonb_array_elements(p_new_history) LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', v_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  -- 5. Old sale stock reversal (restorations — triggers fire)
  FOR h IN SELECT * FROM jsonb_array_elements(p_old_reverse_history) LOOP
    IF h->>'variant_id' IS NOT NULL AND h->>'variant_id' <> '' THEN
      INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, h->>'variant_id', h->>'variant_label', (h->>'change_qty')::int, h->>'type', p_old_sale_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO stock_history (id, product_id, change_qty, type, reference_id, note, cashier_name, created_at, updated_at)
      VALUES (COALESCE((h->>'id')::uuid, gen_random_uuid()), (h->>'product_id')::uuid, (h->>'change_qty')::int, h->>'type', p_old_sale_id, h->>'note', h->>'cashier_name', now(), now()) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  -- 6. Hard-delete old sale (tombstone trigger fires automatically)
  DELETE FROM sales WHERE id = p_old_sale_id;

  RETURN jsonb_build_object('success', true, 'new_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION edit_sale_atomic(jsonb, jsonb, uuid, jsonb) TO anon, authenticated, service_role;
```

## 4b: Create `stock_adjustment` RPC

For manual stock adjustments from inventory page:

```sql
CREATE OR REPLACE FUNCTION stock_adjustment(
  p_product_id uuid,
  p_change_qty integer,
  p_type text,
  p_note text,
  p_cashier text,
  p_variant_id text DEFAULT NULL,
  p_variant_label text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $$
BEGIN
  IF p_variant_id IS NOT NULL AND p_variant_id <> '' THEN
    INSERT INTO variant_stock_history (id, product_id, variant_id, variant_label, change_qty, type, note, cashier_name, created_at, updated_at)
    VALUES (gen_random_uuid(), p_product_id, p_variant_id, COALESCE(p_variant_label, ''), p_change_qty, p_type, p_note, p_cashier, now(), now());
  ELSE
    INSERT INTO stock_history (id, product_id, change_qty, type, note, cashier_name, created_at, updated_at)
    VALUES (gen_random_uuid(), p_product_id, p_change_qty, p_type, p_note, p_cashier, now(), now());
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION stock_adjustment(uuid, integer, text, text, text, text, text) TO anon, authenticated, service_role;
```

## 4c: Update `SUPER_MASTER_SCHEMA.sql`
Add both functions. Push via Management API.

## Success Criteria
- [ ] `edit_sale_atomic` RPC exists and can be called via `supabase.rpc()`
- [ ] `stock_adjustment` RPC exists and can be called
- [ ] Existing RPCs (`commit_sale`, `delete_sale_atomic`, `refund_sale_atomic`) still work
- [ ] Test via curl: call each RPC with sample data, verify stock changes correctly

---

# PHASE 5: REWIRE FRONTEND — ELIMINATE DUAL-WRITE STOCK

## What
This is the CORE stock leakage fix. After this phase, frontend NEVER writes `products.stock` authoritatively — only the DB trigger does.

## 5a: Rewire `salesService.create()`

Currently does (wrong):
1. Locally updates `products.stock` (optimistic)
2. Writes `stock_history` locally
3. Calls `commit_sale` RPC
4. If RPC succeeds, realtime MIGHT clobber local stock (BUG)

Change to:
1. Write local sale + stock_history to Dexie (optimistic display)
2. Update local `products.stock` optimistically (Dexie only, for immediate UI)
3. Call `commit_sale` RPC
4. If RPC succeeds: done — realtime will bring cloud stock (cloud wins, no guard)
5. If RPC fails: queue for retry via syncEngine

**KEY CHANGE:** Remove `isPendingChange` guard from realtime product handler. Realtime product updates from cloud ALWAYS update local Dexie and store.

## 5b: Rewire bill edit (`CheckoutPage.tsx`)

Currently does (wrong):
```
salesService.create(newSale)  ← separate call
salesService.delete(oldSale)  ← separate call — can fail independently!
```

Change to:
```
Call edit_sale_atomic RPC with: newSale + newMovements + oldSaleId + oldReverseMovements
If success → cloud handles everything atomically
If offline → queue the atomic edit for retry
```

### ⚠️ CRITICAL: Side effects OUTSIDE the atomic RPC

The `edit_sale_atomic` RPC handles ONLY: stock movements + sale insert/delete.
These side effects are handled in FRONTEND and must be done AFTER RPC succeeds:

1. **Customer Stats** — `update_customer_stats` DB trigger fires on INSERT (adds new sale total to customer). But DELETE does NOT reverse. So frontend must:
   - Reverse old sale's customer stats: `totalPurchases -= oldSale.total`
   - New sale's stats are auto-added by DB trigger
   - Update customer via `customersService.update()`

2. **Customer Ledger** — Record ledger entry:
   - Reverse entry for old sale (credit type)
   - New entry for new sale (debit type)
   - Via `recordCustomerLedger()`

3. **Payment Balances** — Not in DB:
   - Reverse old sale's payment moves: `adjustPaymentBalances(buildReversePaymentMoves(oldSale))`
   - Apply new sale's payment moves: `adjustPaymentBalances(buildSalePaymentMoves(newSale))`

4. **Local state** — Update Zustand stores:
   - Remove old sale, add new sale
   - Update products (cloud realtime will handle stock)
   - Clear cart

**These side effects must be in a try/catch AFTER the RPC succeeds. If side effects fail, the stock is still correct (atomic RPC), only customer stats/payments need manual fix.**

## 5c: Remove realtime product guard

In `SupabaseAppContext.tsx` (or wherever realtime subscriptions live after Phase 2):
- REMOVE the `isPendingChange('products', id)` guard
- Product updates from realtime ALWAYS win
- This eliminates the "cloud clobbers wrong value" race condition because now cloud IS the correct value

## 5d: CloudPull products — remove pending guard

In `cloudPull.ts`:
- Products fetched from cloud ALWAYS overwrite local
- Remove the `hasPendingOpsFor` filter for products entity
- Other entities (sales, customers, etc.) can keep their guards

## 5e: Remove reconcile system COMPLETELY (87 references across 8 files)

Reconcile is a band-aid for the dual-write problem. Atomic RPCs = no drift = no need for reconcile.

**Delete these files:**
- `src/components/settings/ReconciliationDashboard.tsx` — DELETE entire file

**Remove from these files:**

1. **`src/lib/services/` (after Phase 1 split)** — remove these exported functions:
   - `reconcileAllStock()` (~170 lines)
   - `detectInventoryDrift()` (~65 lines)
   - `auditStockIntegrity()` reference

2. **`src/components/settings/Settings.tsx`** — remove:
   - `import { ReconciliationDashboard } from './ReconciliationDashboard'` (line 57)
   - `<ReconciliationDashboard />` JSX usage (line 1188)

3. **`src/components/settings/DatabaseTools.tsx`** — remove:
   - Any reconciliation-related buttons, text, and handlers (~50 lines)
   - "Stock reconciliation now run automatically" text (line 649)

4. **`src/context/SupabaseAppContext.tsx`** — remove:
   - `stock ledger reconcile` logic blocks (line 2080, 2236)
   - `Additive reconciliation` try/catch blocks
   - Any `reconcile` calls in `loadData()`

5. **`src/components/transactions/TransactionDetailModal.tsx`** — remove:
   - `isReconciling` state (line 34)
   - reconcile handler (line 60+)

6. **`src/components/expenses/ExpenseManager.tsx`** — remove:
   - `reconcile supplier bill` try/catch (line 218)

**Verify removal is complete:**
```bash
grep -rn "reconcil\|Reconcil\|detectInventoryDrift\|auditStockIntegrity" src/ --include="*.tsx" --include="*.ts"
```
**Must return 0 results.**

## 5f: Remove `isPendingChange` guards for products (31 references)

These guards cause stock clobbering. After atomic RPCs, cloud = truth always.

```bash
grep -rn "isPendingChange\|hasPendingOps\|isPendingDelete" src/ --include="*.tsx" --include="*.ts"
```

**For `products` entity ONLY — remove guards.** Keep guards for other entities (sales, expenses, etc.) that might have legitimate pending edits.

In `SupabaseAppContext.tsx` realtime handler:
```diff
- if (isPendingChange('products', payload.new.id)) return; // REMOVE THIS
  useProductsStore.getState().updateProduct(mapProduct(payload.new)); // KEEP
```

In `cloudPull.ts`:
```diff
- const filtered = products.filter(p => !hasPendingOpsFor('products', p.id)); // REMOVE
+ // Products from cloud ALWAYS overwrite local — cloud is truth
```

## 5g: Simplify `loadData()` product merge

The complex `productDelta` + `variantDelta` merge logic in `loadData()` can be simplified:
- On initial load: cloud stock IS truth. Use it directly.
- Only apply pending unsynced movements (if any exist in Dexie pendingOps)
- Remove the complex reconciliation merge block

## 5h: Add ErrorBoundary component

Currently if ANY component crashes → entire app white-screens. Add a safety net:

```
src/components/common/ErrorBoundary.tsx (~60 lines)
```

```typescript
import React from 'react';

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<{children: React.ReactNode; fallback?: React.ReactNode}, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error('[ErrorBoundary]', error); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-[200px] text-red-500">
          <p>Something went wrong. Refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap each route in `App.tsx` with `<ErrorBoundary>`. One crash won't take down the whole app.

## Success Criteria
- [ ] Bill edit uses `edit_sale_atomic` RPC (one call, not two)
- [ ] Realtime product updates always overwrite local (no `isPendingChange` guard)
- [ ] CloudPull products always overwrite local
- [ ] `grep -rn "reconcileAllStock\|detectInventoryDrift\|ReconciliationDashboard" src/` returns NOTHING
- [ ] `grep -rn "isPendingChange.*products" src/` returns NOTHING
- [ ] `ReconciliationDashboard.tsx` file does NOT exist
- [ ] ErrorBoundary wraps routes in App.tsx
- [ ] Manual test: create sale → cloud stock decreases correctly
- [ ] Manual test: delete sale → cloud stock restores correctly
- [ ] Manual test: edit bill → cloud stock net-correct
- [ ] Manual test: two quick sales from same device → stock decreases by sum of both

---

## 5i: REMOVE ESTORE COMPLETELY (4744 lines + 551 cross-references)

**Decision: Estore is NOT a real ecommerce solution. It adds massive complexity to stock system. REMOVE.**

### DELETE these files entirely:
```bash
rm -rf src/components/estore/          # 7 files, 3875 lines
rm -rf src/components/orders/          # 1 file, 869 lines  
```

### Remove from App.tsx routes:
- `/store` route
- `/store/checkout` route  
- `/store/track/:id` route
- `/orders` route (Online Orders page)
- All estore-related lazy imports

### Remove from services (after Phase 1 split):
- Delete `src/lib/services/ordersService.ts` entirely (storeOrdersService, mapStoreOrder, toRemoteStoreOrder, toRemoteSalesTab)
- OR remove just the storeOrders parts, keep salesTabsService

### Remove from SupabaseAppContext.tsx / stores:
- Remove `store_orders` realtime subscription
- Remove `SET_STORE_ORDERS` / `storeOrders` from state
- Remove `editingStoreOrderId` from cart state
- Remove estore order loading from `loadData()`

### Remove from CheckoutPage.tsx (28 references):
- Remove `source_order_id` logic
- Remove `editingStoreOrderId` references
- Remove `storeOrdersService.update()` calls
- Remove estore status updates

### Remove from syncEngine.ts:
- Remove `store_orders` sync handling

### Remove from cloudPull.ts:
- Remove `store_orders` cloud pull

### Remove from localDb.ts:
- Remove `storeOrders` Dexie table
- Remove `store_orders` from `queueOp` type union

### Remove from types/index.ts:
- Remove `StoreOrder` interface
- Remove estore-related fields from other interfaces

### Remove from Header.tsx:
- Remove "Online Orders" navigation link

### Remove from Settings.tsx:
- Remove `estoreEnabled` toggle
- Remove estore-related settings

### SQL cleanup (optional — keep table but remove triggers):
Keep `store_orders` table in DB (don't delete data). But remove estore-specific triggers:
- `estore_oversell_fix`
- `estore_release_stock_trigger`
- `estore_cancel_double_release_guard`
- `estore_place_order` function
- `estore_guards`

### Verification:
```bash
grep -rn "estore\|store_order\|StoreOrder\|storeOrder\|OnlineOrder\|EDITING_STORE_ORDER\|estoreEnabled\|source_order_id" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
```
**Must return 0 results.**

### Impact:
- **~5,500 lines removed** (4744 estore files + ~750 cross-reference cleanups)
- **Stock system significantly simpler** (no oversell guards, no release triggers, no cancel guards)
- **POS core cleaner** (CheckoutPage loses 28 estore checks)
- **Sync simpler** (one less entity to sync)
- **Testing simpler** (one less integration path)

### Success Criteria:
- [ ] `src/components/estore/` does NOT exist
- [ ] `src/components/orders/` does NOT exist
- [ ] No estore routes in App.tsx
- [ ] `grep -rn "estore\|store_order\|StoreOrder" src/` returns NOTHING
- [ ] `npm run build` passes
- [ ] POS works without estore (sale, delete, edit, refund)

---

# PHASE 6: SIMPLIFY SYNC ENGINE (1261 lines → ~500 lines)

## What
After Phase 5, the sync engine is much simpler:
- Sales: retry `commitSaleAuthoritative` RPC (idempotent)
- Deletes: retry `deleteSaleAtomic` RPC (idempotent)
- Edits: retry `edit_sale_atomic` RPC (idempotent)
- Products/customers/settings: upsert to cloud

## What to remove:
1. The complex `commit_sale` batch-sibling gathering logic (lines 384-430 in current syncEngine.ts) — sales now committed via RPC at creation time
2. Reconcile-related code
3. Complex stock restoration logic in orphan handling
4. The `pruneExpiredCancelledOrders` can stay if needed but simplify it

## What to keep:
1. Queue processing loop (process pending ops)
2. Entity-specific sync (upsert/insert/delete)
3. Error handling (STALE_WRITE drops, constraint errors → mark error)
4. Batch processing with retry
5. Conflict resolution for products/customers (updated_at comparison)

## Success Criteria
- [ ] `syncEngine.ts` under 600 lines
- [ ] Sync still works for all entities
- [ ] No reconcile references
- [ ] `npm run build` passes

---

# PHASE 7: CLEAN SQL SCHEMA (3859 lines → ~2000 lines)

## What
Remove duplicate definitions, dead code, and commented-out sections from `SUPER_MASTER_SCHEMA.sql`.

## What to clean:
1. `trigger_update_product_stock` is defined TWICE (line 1177 and line 2608) — keep only one
2. `trigger_update_variant_stock` is defined TWICE — keep only one
3. Remove dead shift-system references
4. Remove any dead reconcile-related functions
5. Ensure each function/trigger is defined ONCE
6. Add the new RPCs from Phase 4
7. Remove `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object ... END $$` wrappers — use `CREATE OR REPLACE` and `DROP TRIGGER IF EXISTS` directly

## Success Criteria
- [ ] No duplicate function definitions
- [ ] Under 2500 lines
- [ ] Schema deploys cleanly on fresh Supabase project
- [ ] All existing RPCs still work

---

# PHASE 8: CLEAN DEPENDENCIES + FINAL STRUCTURE

## 8a: Remove unused npm packages + electron
```bash
npm uninstall @supabase/auth-helpers-nextjs @supabase/auth-helpers-react \
  @supabase/auth-ui-react @supabase/auth-ui-shared glob electron-store \
  electron electron-builder concurrently wait-on
```

**Remove electron scripts from `package.json`:**
- Delete `"electron:dev"`, `"build:win"`, `"build:mac"` scripts
- Delete `"main"` field if it points to electron.cjs

**Delete dead public assets:**
- `public/sqlite3.wasm` (860KB, not used)
- `public/admin-manifest.json` (estore-related, verify first)

## 8b: Delete dead utility files
```bash
rm src/lib/timeFormat.ts      # only imported by estore (deleted in 5i)
rm src/lib/timeUtils.ts       # only imported by Settings — inline or use dateUtils
```
Verify: `grep -rn "timeFormat\|timeUtils" src/` returns 0.

## 8c: Clean estore fields from types + settings
After estore removal, clean `src/types/index.ts`:
- Remove `estoreSortOrder`, `estoreCategorySortOrder` from Product
- Remove `estoreStatus` from Sale
- Remove `'estore'` from `saleType` union
- Remove ALL `estore*` fields from AppSettings (~15 fields)
- **Keep** `storeName`, `storeLogo` (used for receipts, not estore-specific)

Also clean `src/lib/dynamicManifest.ts` — remove estore manifest logic.

## 8d: Update .gitignore
Add to `.gitignore`:
```
delet/
.env
.env.local
env_backups/
```

## 8e: Clean index.css (1331 lines → ~500 lines)
1. Run `grep -rn "className=" src/ | grep -oP '\.[a-z-]+' | sort -u` to find all CSS classes used
2. Compare against `index.css` classes defined
3. Remove all unused classes (especially estore theme classes)
4. Keep: CSS variables, print styles, Tailwind `@apply`, animation keyframes
5. Target: under 500 lines

## 8f: Verify final structure
```
src/
├── components/           ← UI (each file <300 lines)
│   ├── common/
│   │   └── ErrorBoundary.tsx  ← NEW
│   ├── pos/
│   │   ├── cart/              ← split Cart
│   │   ├── checkout/          ← split CheckoutPage
│   │   ├── grid/              ← split ProductGrid
│   │   ├── receipt/           ← split ReceiptPrint
│   │   └── *.tsx
│   ├── inventory/
│   │   ├── product-detail/    ← split ProductDetailHub
│   │   ├── product-modal/     ← split ProductModal
│   │   ├── bundles/           ← split BundleManager
│   │   ├── barcode/           ← split BarcodeGenerator
│   │   ├── suppliers/         ← SupplierManager + SupplierLedger (split)
│   │   └── *.tsx
│   ├── settings/
│   │   ├── tabs/              ← split Settings into tabs
│   │   └── *.tsx
│   ├── transactions/          ← split TransactionsManager
│   ├── reports/
│   │   └── tabs/              ← existing, SalesReport split
│   └── (other feature folders, NO estore/)
├── stores/                    ← Zustand (one per domain, ~10 files)
├── lib/
│   ├── services/              ← split (15 files)
│   ├── syncEngine.ts          ← simplified (<600 lines)
│   ├── cloudPull.ts           ← simplified (<400 lines)
│   ├── localDb.ts             ← split if needed
│   ├── localDbHelpers.ts      ← split from localDb
│   ├── supabase.ts
│   └── (utilities)
├── shared/
│   ├── ui/                    ← shared components (TouchKeyboard split)
│   ├── modules/
│   └── *.ts
├── hooks/
├── types/
│   ├── index.ts               ← barrel
│   ├── product.ts
│   ├── sale.ts
│   └── common.ts
├── context/                   ← slim AuthContext + SupabaseAppContext
└── providers/
```

## 8g: Final file count verification
```bash
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 400' | sort -rn
```
**Should return ZERO files over 400 lines** (except `translations.ts` — pure data).

## Success Criteria
- [ ] `npm run build` — zero errors
- [ ] No code file exceeds 400 lines (translations.ts exempt)
- [ ] `GEMINI.md` under 200 lines ✓
- [ ] `AGENTS.md` under 50 lines ✓
- [ ] No junk files in root ✓
- [ ] ErrorBoundary wrapping routes
- [ ] index.css under 500 lines
- [ ] ReconciliationDashboard.tsx does NOT exist
- [ ] Manual full test: sale → delete → edit → refund → all stock correct

---

# 📊 PHASE DEPENDENCY MAP

```
PHASE 1 (split services) ──→ PHASE 2 (Zustand stores) ──→ PHASE 3 (split ALL 44 components)
         │                                                           │
         └──→ PHASE 4 (atomic RPCs) ──→ PHASE 5 (rewire + reconcile removal + ErrorBoundary)
                       │                          │
                       │                          └──→ PHASE 6 (simplify sync)
                       │
                       └──→ PHASE 7 (clean SQL)

PHASE 8 (clean deps + CSS + .gitignore) ←── ALL previous phases
```

### Parallel execution:
- Phase 1 + Phase 4 can run in parallel (different files)
- Phase 2 + Phase 4 can run in parallel
- Phase 3 (Tier 1) + Phase 3 (Tier 2) can run in parallel (different components)
- Phase 7 + Phase 8 can run in parallel

### Estimated time per phase:
| Phase | Time | Complexity | Files Touched |
|-------|------|-----------|---------------|
| 1 — Split services (4884→15 files) | 2-3h | Medium | 1→15 files |
| 2 — Zustand stores (106 cases→10 stores) | 3-4h | High | 50+ component updates |
| 3 — Split components (44 files→100+ files) | 5-7h | Medium | 44 files |
| 4 — Atomic RPCs | 1-2h | Medium | 2 SQL files |
| 5 — Rewire + reconcile removal + ErrorBoundary | 4-5h | HIGH | 15+ files, 87 reconcile refs |
| 6 — Simplify sync | 1-2h | Medium | 2 files |
| 7 — Clean SQL | 1h | Low | 1 file |
| 8 — Clean deps + CSS + structure | 1-2h | Low | config files |
| **Total** | **~20-28 hours** | | **100+ files** |

---

# ⚠️ CRITICAL WARNINGS

1. **Phases 4+5 are the stock fix.** Do them together. Don't deploy after Phase 4 without Phase 5.
2. **Backup Supabase data before Phase 4.** RPC changes should be backward-compatible, but backup financial data.
3. **After Phase 8, deploy to ALL clones at once.** New code expects new RPCs.
4. **Test stock after every phase.** Create sale, delete sale, edit bill — verify stock is correct.
5. **Phase 3 is the LONGEST.** 44 files need splitting. Can be done in sub-batches (Tier 1 first, then Tier 2, then Tier 3).
6. **translations.ts (2850 lines) stays large.** It's pure data (translation strings). Not a code quality issue.

---

# 🧪 FINAL VERIFICATION CHECKLIST

Run after ALL phases complete:

### Build & Structure
- [ ] `npm run build` — zero errors, zero warnings
- [ ] `find src -name '*.tsx' -o -name '*.ts' | xargs wc -l | awk '$1 > 400' | sort -rn` returns ONLY `translations.ts`
- [ ] `GEMINI.md` under 200 lines ✓
- [ ] `AGENTS.md` under 50 lines ✓
- [ ] No junk MD/SH/CJS files in root ✓
- [ ] `index.css` under 500 lines

### Architecture
- [ ] `src/lib/services.ts` does NOT exist (replaced by `src/lib/services/`)
- [ ] `src/stores/` exists with 10+ Zustand stores
- [ ] No `useReducer` for app state
- [ ] `src/components/common/ErrorBoundary.tsx` exists and wraps routes
- [ ] `src/types/` has split type files with barrel export

### Stock System (MOST IMPORTANT)
- [ ] `edit_sale_atomic` RPC exists and works
- [ ] `stock_adjustment` RPC exists and works
- [ ] Manual: create sale → stock correct
- [ ] Manual: delete sale → stock restored
- [ ] Manual: edit bill → stock net-correct (SINGLE RPC call, not two)
- [ ] Manual: refund → stock restored for refunded items
- [ ] Manual: offline sale → sync when online → stock correct
- [ ] Manual: two devices sell same product → stock correct on both

### Cleanup
- [ ] `grep -rn "reconcileAllStock\|detectInventoryDrift\|ReconciliationDashboard" src/` returns NOTHING
- [ ] `ReconciliationDashboard.tsx` file does NOT exist
- [ ] `grep -rn "isPendingChange.*products" src/` returns NOTHING
- [ ] No unused npm packages in `package.json`

### Audit Query (run on Supabase)
```sql
SELECT p.name, p.stock, COALESCE(SUM(sh.change_qty),0) AS ledger,
       p.stock - COALESCE(SUM(sh.change_qty),0) AS drift
FROM products p LEFT JOIN stock_history sh ON sh.product_id = p.id
WHERE p.track_inventory = true
GROUP BY p.id, p.name, p.stock
HAVING p.stock != COALESCE(SUM(sh.change_qty),0);
```
**Must return 0 rows.**

---

# 📈 BEFORE vs AFTER COMPARISON

| Metric | BEFORE | AFTER |
|--------|--------|-------|
| Largest file | `services.ts` — 4,884 lines | No file > 400 lines |
| GEMINI.md | 754 lines (46KB) | 130 lines (5KB) |
| AGENTS.md | 80 lines | 30 lines |
| Root MD files | 12 files (500KB+) | 4 files (10KB) |
| Reducer cases | 106 in ONE file | 0 (Zustand stores) |
| Realtime subscriptions | 24 in ONE component | Distributed across stores |
| Reconcile system | 87 references, band-aid | REMOVED (not needed) |
| Stock write points | 3 (local + cloud + state) | 1 (RPC trigger only) |
| Bill edit | 2 separate calls (can fail) | 1 atomic RPC |
| Error boundaries | None | Wrapping all routes |
| Tests | Zero | Critical financial tests |
| isPendingChange guards | 31 references | 0 for products (cloud wins) |
| Components > 1000 lines | 11 files | 0 files |
| Components > 300 lines | 51 files | 0 files (except translations) |
| Estore complexity | 4744 lines + 551 cross-refs | REMOVED entirely |
| Total codebase | ~63,470 lines | ~52,000 lines (18% smaller) |
