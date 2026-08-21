# TESTING.md — POS Global Ledger Verification

> Ye file batati hai ke fix ki gayi cheezein **kaise verify karni hain**.
> 3 tareeqay hain, asan se mushkil tak. Pehle #1 chala lo (backend nahi chahiye).

---

## Tareeqa 1 — Logic Unit Tests (abhi chal sake, DB nahi chahiye)

Pure calculation functions (jo ledger math chalati hain) ka real test.
Already bana chuka hoon aur **50/50 PASS** araha hai.

**Files under test:**
- `src/lib/reportsUtils.ts` → `getItemCOGS`, `getEffectiveTotal`, `netItemQty`, `getItemRevenue`
- `src/lib/services/ledgerResolver.ts` → `resolveReversal`, `walletDelta`, `saleTxnType`, `isReturnDirectionSale`

**Cover karta hai (phases):** 4A, 4A-i, 4A-ii, 5, 6, 16, 19, 20, 24, 15A, 39A.

**Dubara chalaane ka tareeqa:**
```bash
# 1. bundle the pure modules
npx esbuild src/lib/reportsUtils.ts src/lib/services/ledgerResolver.ts \
  --format=esm --bundle --outdir=/tmp/ledgertest --out-extension:.js=.mjs

# 2. run the test (test file: /tmp/ledgertest/run2.mjs)
node /tmp/ledgertest/run2.mjs
```

Expected: `=== RESULT: 50 passed, 0 failed ===`

---

## Tareeqa 2 — In-App Self-Test Button (recommended, live data)

Ek button (Settings ya Reports mein) jo background mein ye scenarios
tumhare **live DB/data** par run kare aur screen par PASS/FAIL list de de.
Isko browser chahiye par tumhe manually kuch krne ki zarurat nahi.

Banana baaki hai — priority yahi rakhna.

---

## Tareeqa 3 — Playwright E2E (sab se real, backend chahiye)

App chala kar asli clicks karega. `tests/` folder mein scenario-wise
scripts. `npm run test:e2e` se chalein. Backend (Supabase) running hona
zaroori hai.

---

## Screen-by-Screen Test Menu (Tareeqa 2/3 ke liye)

### A) POS Checkout — Sale banana
1. Customer 1: 4×100 Cash → Sale 400, Inv -4, Cash +400.
2. Customer 2: 5×100 Online → Sale 500, Inv -5, Online +500.
3. Customer 3: 10×100 Bank → Sale 1000, Inv -10, Bank +1000.
4. Customer 4: 5×100, 10% disc → Subtotal 500, Disc 50, Payable 450, Cash 225 + Bank 225. Original subtotal 500 saved rahe.
5. **Negative Sale (Return mode): -5×100 → Sale -500. Inv +5 IN AUR selected wallet -500 OUT.**

### B) Transactions → Bill Detail (Return/Refund/Edit/Delete)
6. Partial Return (C4): 3 return → Refund Cash 135 + Bank 135, Inv +3, Net 180.
7. Full Refund same wallet: net 90.
8. Refund different wallet: orig Cash+Bank intact, naya Online -270 OUT.
9. Edit 5→2 items: Inv +3 IN, Cash 90, Bank 90, salesman Ali unchanged.
10. Edit + Wallet change: purani wallet fully reversed, new Online +180.
11. Edit + Item add 5→7: +180, Inv -2 extra, Total 630, no duplicate 450.
12. Discount change: -100 wallet OUT, Inv 0 move.
13. Price change 5×100→5×120: +100 wallet IN, Inv 0 move.
14. Delete normal sale (+5): Stock +5 IN, wallet reverse.
15. **Delete return bill (-5): Stock -5 OUT.**

### C) Reports
16. Sales Report: Total Revenue = -500 (0 nahi), Profit negative.
17. Financial Report: Total Revenue = -500, Net Profit negative.
18. Inventory Report: Sold Qty = -5, Revenue = -500.
19. Salesman Report: deleted/reversed bills count na hon, partial = remaining net.
20. Cashier Report: same.

### D) Expenses & Suppliers
21. Expense 400 Cash → Cash -400, Expense 400, Inv 0.
22. Supplier payment 1000 split → wallet total -1000.
23. Supplier purchase → Inv +10 IN, wallet sirf real payment par.

### E) Wallets & Transfer
24. Transfer Cash→Bank 500 → Cash -500, Bank +500, sale nahi count.
25. Har wallet: Opening + IN − OUT = Balance.

### F) Users / Roles (39A)
26. Block user → session expire, login reject.
27. Delete user → login reject, history intact.
28. Password change → purani sessions expire.
29. Cashier se Admin API → 403.

### G) Offline / Sync (29B)
30. Offline sale → red banner "1 unsynced".
31. Reconnect → PENDING→CONFIRMED, banner -1.
32. Sync fail → local effect auto-revert, banner "1 failed" (silent STUCK nahi).
33. Idempotency → 5x retry = 1x effect.

### H) Final Zero Test (31)
34. Starting state note karo → upar sab chala kar → sab reverse/delete karo →
    Final Inventory = Starting, Sab Wallets = Starting, Diff = 0.

---

## Status (abhi tak)
- **Tareeqa 1 (logic tests):** ✅ 50/50 PASS — phases 4A, 4A-i, 4A-ii, 5, 6, 16, 19, 20, 24, 15A, 39A math verified.
- **Tareeqa 2/3 (live E2E):** ⏳ NEEDS RUNNING APP + SUPABASE. Is environment mein backend nahi hai, is liye full E2E verify nahi ho saka.
- **Sab se pehle ye 3 chala lo:** #5 (neg sale wallet -500), #15 (return delete stock -5), #16–18 (reports -500/-5 na ke 0).
