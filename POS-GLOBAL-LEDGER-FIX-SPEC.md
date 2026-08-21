# POS-GLOBAL-LEDGER-FIX-SPEC.md

## Objective

Poore POS system (Inventory + Wallets + Sales + Returns + Refunds + Discounts + Bill Edits + Deletes + Reversals + Payments + Expenses + Suppliers + Salesman + Cashier + Offline Sync + Multi-Device Sync) ko **FIX** karo taake har scenario mein 100% mathematically aur logically consistent rahe.

Ye document **audit nahi** hai — ye **fix + enforce + verify** document hai.

Rule: **Pehle codebase mein jo bhi is spec se match nahi karta usay FIX karo. Fix ke baad neeche diye gaye har "FINAL RESULT" ko actual test se verify karo. Agar Expected = Actual nahi hai to system abhi bhi GALAT hai — dubara fix karo jab tak match na ho jaye.**

Koi superficial patch mat lagao. Global transaction/ledger architecture ke through fix karo, isolated plus/minus code ko allow mat karo.

---

## 1. BASELINE SCENARIOS — INKO SYSTEM MEIN AISE HI KAAM KARWAO

### Customer 1
4 items @100, Cash Wallet IN = 400, Inventory OUT = 4, Salesman = Ali, Cashier = Shoaib.
**System ko is tarah fix karo ke:** Sale=400, Cash IN=400, Inventory OUT=4, Salesman/Cashier/Date/Device/Sync/Txn ID/Bill ID sab linked, Wallet Diff=0, Inventory Diff=0.
Agar match na ho → wallet allocation ya inventory deduction logic fix karo.

### Customer 2
5 items @100, Online Transfer IN=500, Inventory OUT=5.
**Fix karo taake:** Sale=500, Online IN=500, Inventory OUT=5, Diff=0 dono taraf.

### Customer 3
10 items @100, Bank IN=1000, Inventory OUT=10.
**Fix karo taake:** sab metadata linked ho, Diff=0.

### Customer 4 — Discount + Multi-Wallet
5 items, Subtotal=500, Discount 10%=50, Final=450, Cash=225 IN, Bank=225 IN, Inventory=5 OUT.
**Fix karna hai ke:**
- Discount se inventory quantity change NA ho — agar ho rahi hai to discount aur inventory logic ko separate karo.
- Original subtotal (500) hamesha preserve ho — agar discount apply hone par subtotal overwrite ho raha hai to usay alag field mein store karo.
- Discount (50) separately traceable ho.
- Cash=225, Bank=225, Total=450 — agar split wrong calculate ho raha hai to payment allocation function fix karo.
**Verify:** Expected vs Actual har field (Subtotal, Discount, Payable, Cash, Bank, Inventory) — Diff=0 na ho to FAIL, wapis fix karo.

---

## 2. SALESMAN KO SALE LIFECYCLE SE PERMANENT LINK KARO

Fix requirement: Original Sale ka Salesman kabhi bhi kisi baad ke action (return/refund/edit/delete) se **overwrite/replace nahi hona chahiye**.

Agar current code mein salesman field har update par overwrite ho raha hai → **do separate fields banao:**
- `original_salesman` (immutable, sirf sale creation par set)
- `action_performed_by` (har action ke liye alag record, editable)

Return/Refund/Edit/Delete jaisi har action apne "performed_by" record ke saath ek nayi audit-trail entry banaye, purani entry ko touch na kare.

**Verify:** Original Salesman, Original Cashier, Current Action User, Return/Refund/Edit/Delete User, Transaction ID, Parent Bill ID, Child Action ID — sab match hone chahiye. Agar koi field wrong ya missing hai to salesman/cashier tracking module ko fix karo.

---

## 3. SALESMAN REPORTING — FIX KARO

Fix karna hai:
- Deleted/fully-reversed bills ko active sales total mein **count na karo** — agar ho raha hai to reporting query mein status filter add karo.
- Partial return waali sale mein **sirf remaining net amount** count ho — agar poori original amount count ho rahi hai to net-calculation logic fix karo.
- No double counting — agar edit/return dono se ek hi amount do baar add ho raha hai to ledger-based (not field-based) calculation par shift karo.

**Verify:** Salesman Report Total = Actual net active transactions ka sum. Diff≠0 hone par report engine fix karo.

**Cross-check (Phase 4A-i se linked):** Negative/minus sales ka effect bhi is total mein signed (negative) reflect hona chahiye — agar koi `Math.max(0,...)` ya clamp logic yahan bhi hai to wahi fix karo jo Phase 4A-i mein describe kiya gaya hai.

---

## 4. CASHIER / OPERATOR TRACKING — FIX KARO

Har action type (sale create, edit, return, refund, delete, payment change, wallet change, discount change, item add/remove, manual adjustment, inventory correction, supplier payment, expense create/edit/delete) ke liye **alag audit event** record karna zaroori hai.

Agar abhi single "last_updated_by" field use ho raha hai jo overwrite hota hai → **isay hatao aur ek `audit_events` table/collection banao** jisme har action: User + Date/Time + Device + Action Type + Transaction ID store ho.

**Verify:** Original salesman/cashier history kabhi overwrite na ho — test karke confirm karo, agar overwrite ho raha hai to fix incomplete hai.

---

## 4A. KNOWN BUG — NEGATIVE-QUANTITY / MINUS BILL (Inventory Plus but Wallet Minus Missing)

**Reported Issue (real production bug found):**
Ek bill negative quantity ke saath process hua (minus 5 items — return/adjustment type sale). Result:
- Inventory: **sahi** — 5 IN ho gayi (stock plus hua, correct).
- Wallet: **GALAT** — jo wallet select ki gayi thi (Cash/Bank/Online/etc) us mein amount **minus (OUT) nahi hua**. Wallet balance untouched raha.
- Isi wajah se overall reports (Salesman Report, Cashier Report, Wallet Ledger, Sales Report) mein amounts galat/inconsistent aa rahe hain — wallet ka minus effect missing hone se saara reconciliation off ho gaya.

**Root Cause (fix ke liye zaroori):**
Negative-quantity sale ka sign-handling refund/delete logic mein sirf **inventory** direction ko flip kar raha hai, **wallet** direction ko flip nahi kar raha. Ye ek isolated/incomplete plus-minus implementation hai jo global reversal rule (Phase 16) ko bypass karta hai — exact wahi cheez jo Phase 34 mana karta hai.

**Fix Requirement:**
Negative-qty transaction ko normal sale ka **mirror transaction** treat karo — Phase 16 ke Global Reversal Rule table ke through hi process karo, alag/special-case code mat likho:
```
Normal Sale (qty +5):     Inventory OUT 5,  Wallet IN  (amount)
Negative Sale (qty -5):   Inventory IN  5,  Wallet OUT (amount)   ← ye missing tha, isay add karo
```
Jis wallet ko select kiya gaya (Cash/Bank/Online/Card/etc), usi wallet mein exact amount **OUT** hona chahiye — inventory flip ki tarah wallet flip bhi mandatory hai, dono sath sath hone chahiye, ek-taraf fix nahi.

**Verify (sab jagah plus/minus dono sync hone chahiye):**
- Inventory: +5 IN ✓ (already correct)
- Wallet (jo select ki gayi): −(amount) OUT ✓ (ye ab fix hona chahiye)
- Sales Report: is transaction ka effect minus/negative reflect kare
- Salesman Report: is salesman ke net total mein se minus ho
- Cashier Report: is cashier ki collection mein se minus ho
- Grand Total (sab wallets + sab transactions milakar): agar sirf yehi transaction thi to **Grand Total = 0** hona chahiye (inventory ka plus + wallet ka minus dono ek doosre ko balance karein), 0 na aaye to fix incomplete hai.

**FINAL STATUS:** PASS sirf tab jab inventory AUR wallet dono opposite directions mein exactly move karein aur reconciliation Diff=0 aaye. Sirf inventory sahi hona kaafi nahi hai.

---

### 4A-i. REAL EXAMPLE FOUND — REPORTS MEIN NEGATIVE VALUES `0` PAR CLAMP HO RAHI HAIN

**Observed (screenshots se confirm):** Minus/return-type sale (-500, -5 qty) process hone ke baad Wallet Ledger mein Cash `-500` sahi dikh raha tha, lekin **Reports tabs mein wahi negative value `0` ban ja rahi hai**:

| Location | Field | Current (Galat) | Expected (Sahi Final) |
|---|---|---|---|
| Sales Report (`/reports/sales`) | Total Revenue | `Rs 0` | `Rs -500` |
| Sales Report (`/reports/sales`) | Gross Profit / Net Profit | `0` | Negative sale ka proportional negative asar (cost basis ke hisaab se calculate, `0` clamp nahi) |
| Financial Report (`/reports/financial`) | Total Revenue (top card) | `Rs 0` | `Rs -500` (Wallet Flow section jaisa hi jahan Cash `-500` sahi dikh raha hai) |
| Financial Report (`/reports/financial`) | Net Profit (top card + bottom summary) | `0` | Negative sale ka effect included, `0` clamp nahi |
| Inventory Report (`/reports/inventory`) | Sold Qty (product row) | `0.0` | `-5` |
| Inventory Report (`/reports/inventory`) | Revenue (product row) | `Rs 0` | `Rs -500` |

**Root Cause:** Reporting/aggregation layer ke calculation code mein (Total Revenue, Profit, Sold Qty, Product Revenue nikalne wale functions) kahin **`Math.max(0, value)`** ya equivalent clamp/floor lagaya hua hai, ya negative amounts ko `if (amount < 0) skip/ignore` kar diya ja raha hai. Ye ek **isolated report-layer bug** hai jo Wallet Ledger ke actual correct value (`-500`) ko report tak aane hi nahi deta — same tarah ka "ek jagah sahi, doosri jagah galat" pattern jaisa Phase 4A ka main bug hai (wahan wallet miss ho raha tha, yahan reports mein negative clamp ho raha hai).

**Fix Requirement:**
- Har report/aggregation function mein `Math.max(0, ...)`, `Math.abs(...)`, ya "skip if negative" jaisi koi bhi clamping logic **dhoondo aur hatao** — Sales Report, Financial Report, Inventory Report, aur baaki sab reports (Salesman, Cashier, Supplier, Expense) ke calculation code ko scan karo.
- Revenue, Profit, Sold Qty, Product Revenue — sab **raw signed sum** hone chahiye (negative sales/returns apna negative effect sahi se carry karein), Wallet Ledger jaisa hi consistent.
- Ye fix Wallet Ledger ko touch nahi karega (wo already sahi hai) — sirf Reports/Aggregation layer ko fix karna hai taake wahi truth reflect ho jo Ledger mein hai.

**Verify — Final kaise hone chahiye (is exact example ke liye):**
```
Sales Report → Total Revenue        = -500  (0 nahi)
Sales Report → Net/Gross Profit     = negative (cost-basis ke hisaab se, 0 nahi)
Financial Report → Total Revenue    = -500  (Wallet Flow Cash -500 ke match)
Financial Report → Net Profit       = negative, 0 nahi
Inventory Report → Sold Qty         = -5    (0.0 nahi)
Inventory Report → Revenue          = -500  (0 nahi)
```
Har report ka number **Wallet Ledger aur Inventory Ledger ke actual signed values se match** hona chahiye — koi bhi report apna independent/clamped calculation na kare (Phase 26 ka single-source-of-truth rule yahan bhi apply hota hai). Agar koi ek report bhi `0` dikhaye jab ledger mein negative value ho, to wo report **FAIL** hai, fix incomplete hai.

---

### 4A-ii. RELATED BUG — COGS (Cost of Goods Sold) DOUBLE-NEGATIVE SIGN ERROR

**Ye Phase 4A-i ke root cause ka ek deeper layer hai — profit `0` nahi balki galat `-500` extra ban raha tha kyunke COGS calculation mein sign do baar flip ho raha tha.**

**Observed Bug (found in `reportsUtils.ts` → `getItemCOGS`):**
- `purchaseCost` database mein hamesha **absolute/positive** save hota hai (e.g. `50 * |-5| = 250`, minus qty ke bawajood).
- Negative-qty (return) bill ke liye code cost ko minus karne ki koshish karta tha, lekin database se already-positive value uthate waqt, aur qty ka ratio bhi `-1` hone ki wajah se: `+250 (Cost) × -1 (Ratio) = -250` expected tha — **lekin fallback logic mein cost pehle hi kisi jagah minus set ho chuki thi, jo dobara `-1` se multiply hoke wapis `+250` positive ban gayi.**
- **Net result:** Normal sale COGS `+250` + Return sale COGS (galti se) `+250` = **Total COGS `500`** (jabke honi chahiye `0` thi) → is wajah se Profit `-500` chala gaya (double-counted cost).

**Fix Requirement:**
- `getItemCOGS` (ya jahan bhi COGS calculate hota hai) mein rule enforce karo: **Original Quantity minus hai to Cost hamesha minus pass ho — chahe database se value positive aaye ya negative, sign ko qty ke sign se hi derive karo, database ke stored sign par bharosa mat karo.**
- Sirf ek clean positive ratio/percentage (multiplier=1) use karo, **double sign-flip na ho** (na code mein, na database-fallback mein) — sign sirf ek hi jagah decide ho.

**Verify (Expected Final):**
```
Normal Sale (qty 5)   → COGS = +250
Return Sale (qty -5)  → COGS = -250
Total COGS            = 0
Total Profit           = 0
```

**Discount Rule (verify bhi is MD mein confirm karo):**
- Discount **sirf Revenue ko kam karta hai**, COGS ko touch nahi karta.
- COGS hamesha **actual physical quantity movement** ke barabar minus/plus hoga (discount se independent).
- Formula: `Gross Profit = Revenue − COGS` — Discount, Revenue ke andar hi already reflect ho chuka hota hai, COGS side par dobara apply nahi hota.

**Verify — is fix ke baad reports mein final values:**
```
Sales Report      → Total Revenue = -500, Profit = 0 (agar 5 normal + (-5) return net-out ho rahi ho)
Financial Report  → Total Revenue = -500, Net Profit = 0
Inventory Report  → Sold Qty = -5 net (agar mixed), Revenue = -500
```
**Important:** Ye Phase 4A-i ke table se ek nuance zyada hai — Revenue ka `-500` dikhna sahi/expected hai (ye asal minus-sale ka effect hai), lekin **Profit ka final number transaction-mix par depend karta hai**: agar normal+return dono ek dusre ko net-out kar rahe hain to Profit `0` sahi hai; agar sirf akela negative-qty bill hai (jaisa Phase 4A ka original scenario) to Profit bhi Revenue ke proportion mein negative hi rahega, `0` par forcefully clamp nahi hona chahiye. **Dono cases ko alag test karo, ek dusre se confuse mat karo.**

**FINAL STATUS:** PASS sirf tab jab COGS ka sign ek hi jagah se derive ho raha ho (no double-flip), Discount COGS ko affect na kare, aur Profit = Revenue − COGS formula har mix (normal-only, return-only, normal+return combined) mein exactly reconcile ho.

---

## 5. PARTIAL RETURN — EXACT LOGIC FIX KARO

Scenario: 5 items, 10% disc, Final=450 (Cash 225 + Bank 225), 3 return.
Effective price/item after discount = 90. Return value = 270.

**Fix karna hai:**
- Refund allocation original payment ratio (50/50) follow kare: Cash OUT=135, Bank OUT=135.
- Inventory: 3 IN, Net OUT=2.
- Remaining sale=180, Cash net=90, Bank net=90.

Agar system flat/full price se refund calculate kar raha hai (discount ignore karke) → discount-aware refund calculation function likho/fix karo jo per-item effective price use kare.

**Verify:** Cash Diff=0, Bank Diff=0, Inventory Diff=0, Sale Diff=0 — sab exact match, warna fix incomplete.

---

## 6. RETURN REFUND WALLET — SAME YA DIFFERENT WALLET DONO SUPPORT KARO

**Method A (same wallet refund):** Cash 225 IN, 135 OUT → net 90. Bank same.

**Method B (different wallet refund):** Original Cash=225 IN + Bank=225 IN untouched/intact rehna chahiye; naya Online Transfer=270 OUT refund ke liye alag record ho.

Fix karna hai: **Original payment wallet history ko kabhi hard-subtract mat karo agar refund kisi doosre wallet se diya gaya ho.** Refund ka apna record ho: Original Wallet, Refund Wallet, Refund Amount, Refund Operator, Date/Time, Parent Bill, Refund Transaction ID — sab alag track ho.

**Verify:** Original Cash/Bank IN intact rahe, Refund wallet OUT sahi ho, Inventory IN=3.

---

## 7. BILL EDIT — 3 ITEMS REMOVE (5→2)

Fix: New subtotal=200, discount=20, payable=180, diff=270, Inventory 3 IN, Cash 225→90, Bank 225→90.

Agar edit karte waqt system **naya bill bana kar purana delete** kar raha hai (jisse audit trail toot jata hai) → isay fix karo taake edit ek "delta transaction" ke roop mein record ho, purani sale ka reference intact rahe.

**Verify:** Net Inventory=2 OUT, Cash=90, Bank=90, no duplicate OUT/IN, Salesman=Ali unchanged.

---

## 8. EDIT BILL + WALLET CHANGE

Old: Cash 225 + Bank 225. New: Online 180.

Fix: Purani wallet allocation **completely reconcile** (reverse) honi chahiye, nayi allocation clean apply honi chahiye. Agar dono overlap ho rahe hain (partial reverse + partial add se hidden amount ban raha hai) → wallet-change logic ko "full reverse then full re-apply" pattern par fix karo.

**Verify:** Old Cash/Bank fully reconciled, New Online=180 IN, no orphan payment, no duplication.

---

## 9. EDIT BILL — ITEM ADD (5→7)

Fix: Diff=180, Inventory 2 additional OUT, Additional Payment IN=180, Total=630. Purana 450 duplicate na ho.

Agar system pura bill dubara total kar ke wallet mein dobara 630 IN daal raha hai (450 already existing ke upar) → isay fix karo: **sirf delta (180) hi naya IN ho**, purana intact rahe.

**Verify:** No duplicate 450, No duplicate inventory OUT, Final=630.

---

## 10. DISCOUNT CHANGE

10 items × 100 = 1000. No discount → 10% discount → Final 900. Diff=100 (wallet OUT), Inventory movement=0.

Fix: Discount change se **kabhi inventory move na ho**, sirf financial diff wallet mein adjust ho. Agar current code discount change par inventory bhi touch kar raha hai to usay decouple karo (discount aur inventory alag functions).

**Verify:** Inventory Diff=0, Wallet Diff = exact payable difference.

---

## 11. ITEM PRICE CHANGE

5×100=500 → 5×120=600. Diff=100, Inventory Diff=0, Payment +100 IN, price history preserved.

Fix: Price change history ko separate log mein store karo (overwrite mat karo) taake purani price traceable rahe.

**Verify:** Inventory Diff=0, Payment Diff=+100.

---

## 12. REMOVE ITEM + DISCOUNT

5 items 10% disc → 3 removed → Inventory 3 IN, remaining 2 OUT, discount recalculate, wallet = exact reversal.

Fix: Item-remove aur discount-recalculate dono **ek hi atomic transaction** mein ho, taake beech mein koi inconsistent intermediate state save na ho.

**Verify:** Net Inventory=2 OUT, wallet = exact remaining payable, no duplicate movement.

---

## 13. RETURN + DISCOUNT (order-level, item-level, %, fixed, tax, other charges)

Fix: Return allocation calculation **actual applied pricing rule** (order-level vs item-level, % vs fixed) ko dynamically use kare, hardcoded flat-price assumption na ho.

**Verify:** Returned inventory correct, refund correct, discount allocation correct, remaining bill correct.

---

## 14. REFUND — HAR SCENARIO FIX KARO

Full refund, partial refund, single/multiple item, discounted items, multi-wallet, different/same refund wallet, refund-after-edit, refund-after-return, refund-after-payment-change, refund-after-wallet-change.

Fix: Har refund record mein mandatory fields ho: Refund ID, Parent Bill ID, Original Transaction ID, Refund Amount, Refund Wallet, Inventory Effect, Salesman, Original Cashier, Refund Operator, Date/Time, Device, Sync Status.

**Verify:** Refund amount exact, wallet OUT exact, inventory IN exact (jab physical return ho), no duplicate refund/movement, salesman reporting correct.

---

## 15. BILL DELETE — LEDGER-BASED REVERSAL PAR FIX KARO

Fix: Delete **current bill ke fields se nahi**, balke **transaction history/ledger ke net movements se** reverse ho. Agar abhi delete sirf latest state read kar ke reverse kar raha hai (jo edited/returned bills par galat result dega) → is logic ko poore ledger ka sum use karne ke liye fix karo.

**Verify:** Inventory & wallets exact original state par wapis aayein, sales/salesman report reconcile ho, action history delete na ho (sirf reversed status mile).

---

### 15A. REAL BUG FOUND — RETURN-BILL DELETE SILENTLY SKIPPED (Detection Logic Flaw)

**Observed Bug:** Normal Sale (+5) delete karne par stock movement sahi record hua ("SALE DELETED +5 IN"). Lekin **Return Bill (-5) delete karne par kuch bhi record nahi hua** — na stock adjust hua, na history entry bani. Delete silently skip ho gaya.

**Root Cause:**
`saleDelete.ts` mein delete-logic ye check karta tha ke "is bill mein pehle koi return ho chuka hai?" — aur is check ke liye purani **history entries mein tag `'return'` dhoond raha tha** (string-tag matching, fragile approach — Phase 34 ka "isolated bypass" pattern).

Masla: Jab khud ek **Return Bill (-5)** banta hai, uski apni history ka tag bhi `'return'` hota hai. Toh jab usi Return Bill ko delete kiya gaya, code ne dekha "history mein `'return'` tag already mojood hai" aur galat assume kar liya ke "ye already reversed ho chuka hai, kuch mat karo" — **aur poora deletion process hi skip ho gaya.**

**Fix Applied:** Tag-based string matching (`'return'` dhoondna) hatao. Uski jagah **`refundedQuantity`** field (jo system accurately track karta hai) ko source-of-truth banao delete-detection ke liye — koi bhi history-tag-guessing na ho.

**General Rule (is se seekh — sab jagah apply karo):**
Delete/Refund/Adjustment jaisi koi bhi reversal-detection logic **kabhi bhi loose tags/labels/strings match kar ke decide na kare** ke "ye already reversed hai ya nahi" — hamesha **actual tracked numeric fields** (jaise `refundedQuantity`, `returnedQuantity`, ledger sum) use karo. String-tag approach isliye fail hota hai kyunke Normal-Sale aur Return-Bill dono ki history mein same tag (`'return'`) aa sakta hai, jisse system confuse ho jata hai ke kaunsi transaction actually reversed hai aur kaunsi khud hi ek return-type transaction hai.

**Fix ke baad Expected Behavior:**
```
Normal Sale (+5) delete   → Stock: +5 IN   (item wapis stock mein aaya)
Return Sale (-5) delete   → Stock: -5 OUT  (customer ka return cancel hua, item wapis stock se nikla)
```

**Verify:**
- Naya +5 sale banao → delete karo → stock movement `+5 IN` record ho, history entry bane.
- Naya -5 return banao → delete karo → stock movement `-5 OUT` record ho, history entry bane (pehle jo missing tha).
- Dono ke baad Net Inventory = starting state par wapis aaye, Diff=0.
- **Purane already-deleted bills jinka action skip ho gaya tha** — unko is MD ke Phase 28 (Historical Data Repair) ke through manually reconcile karo, kyunke unki history ab bhi missing rahegi jab tak backfill na ho.

---

### 15B. SAME PRINCIPLE — REFUND AUR MANUAL ADJUSTMENT PAR BHI APPLY KARO

Ye "tag-based guessing vs field-based tracking" bug sirf Delete tak mehdood nahi — **Refund** aur **Manual Inventory Adjustment** dono mein bhi same risk hai. In dono ko bhi audit/fix karo:

**Refund:**
- Refund-detection ya "kya ye item pehle refund ho chuka hai" check bhi `refundedQuantity`/`refundedAmount` jaise numeric fields se ho, history-tag string-match se nahi.
- Refund ka Inventory effect: agar physical item wapis aaya (return-with-refund) → Inventory **IN**; agar sirf paisa wapis ho raha hai bina item wapas aaye (refund-without-return) → Inventory **untouched** (koi movement nahi) — dono cases ko field-level flag (`isPhysicalReturn: true/false`) se differentiate karo, tag-guessing se nahi.
- Refund ka Wallet effect: hamesha **OUT** us wallet mein jahan se refund actually diya gaya (Phase 6 dekho).

**Manual Adjustment (Stock Correction/Restock):**
- Adjustment **plus** (restock/correction-add) → Inventory **IN**.
- Adjustment **minus** (damage/loss/correction-remove) → Inventory **OUT**.
- Adjustment ka apna `adjustmentType` (plus/minus) field ho jo explicit ho — history-tag se infer na kiya jaye ke adjustment plus tha ya minus.
- Adjustment ko delete/reverse karte waqt bhi wahi rule: **explicit signed quantity field** use karo (jaisa `refundedQuantity` ka pattern tha), tag-string dhoond kar decide mat karo.

**Verify (dono ke liye):**
```
Refund with physical return     → Inventory IN (exact returned qty), Wallet OUT (exact refund amount)
Refund without physical return  → Inventory unchanged, Wallet OUT only
Manual Adjustment (+qty)        → Inventory IN
Manual Adjustment (-qty)        → Inventory OUT
Delete/Reverse of any of above  → exact opposite movement, based on stored signed field, not tag-matching
```

**FINAL STATUS (15A + 15B combined):** PASS sirf tab jab Delete, Refund, aur Manual Adjustment — teeno ka reversal-detection **numeric/explicit fields** se ho raha ho, kahin bhi `'return'`/`'refund'`/`'adjustment'` jaise string-tags ko decision-making ke liye match nahi kiya ja raha ho. Codebase mein har jagah scan karo jahan history-array mein `.find(tag === 'return')` ya similar pattern ho — sab ko field-based check se replace karo.

---

## 16. GLOBAL REVERSAL RULE — HARDCODE MAT KARO, RULE-BASED BANAO

```
SALE:                Inventory OUT, Wallet IN
NEGATIVE-QTY SALE:   Inventory IN,  Wallet OUT   ← Phase 4A bug: is line ka wallet-half missing tha, dono ho
RETURN:               Inventory IN,  Wallet OUT
REFUND:                Wallet OUT,    Inventory IN (only if physical return)
DELETE SALE:          Inventory IN,  Wallet OUT
DELETE RETURN:        Inventory OUT, Wallet IN
REVERSE WALLET IN:    Wallet OUT
REVERSE WALLET OUT:   Wallet IN
```

Fix: Ek central "reversal resolver" function banao jo Transaction Type + Movement Direction + Original Ledger Entry se automatically opposite movement calculate kare. Manual +/- guesswork wale saare code paths isay use karne ke liye refactor karo.

**Critical Rule (Phase 4A se linked):** Kisi bhi transaction type mein Inventory movement fix karte waqt uska paired Wallet movement bhi **isi resolver se** aana chahiye — kabhi bhi sirf ek side (inventory ya wallet) ko independently patch mat karo. Dono ek hi resolver call ka output hon.

**Verify:** Har movement ka exact reversible opposite exist kare — including negative-qty sales (inventory IN paired with wallet OUT) — test karo.

---

## 17. PRODUCT INVENTORY LEDGER — FIX + ENFORCE

Formula jo hamesha true honi chahiye:
```
Opening + Total IN - Total OUT = Current Stock   → Difference = 0
```
Fix: Agar kahin bhi direct `stock -= qty` ya `stock += qty` ho raha hai bina ledger entry ke, usay **ledger-write-then-recompute** pattern se replace karo (current stock hamesha ledger sum se derive ho, direct mutate na ho).

**Verify:** Har product ke liye Diff=0, mismatch mile to exact transaction source identify karke fix karo.

---

## 18. WALLET LEDGER — FIX + ENFORCE

```
Opening + Total IN - Total OUT = Current Balance   → Difference = 0
```
(Cash, Bank, Online, Card, Easypaisa, JazzCash, etc — sab wallets independently.)

Fix: Wallet balance bhi **ledger-derived** ho, direct field mutation na ho. Refunds, Expenses, Supplier Payments, Manual Entries, Adjustments, Reversals, Deleted Transactions, Transfers — sab ek hi ledger table mein entries ke roop mein jayein.

**Verify:** Har wallet Diff=0.

---

## 19. CUSTOMER MULTI-WALLET PAYMENT

Sale=1000, Cash=400 + Bank=300 + Online=300.

Fix: Payment-split function ko fix karo taake total allocation kabhi sale amount se mismatch na ho (validation add karo: sum(allocations) === payable, warna reject/error).

**Verify:** Total IN = Sale amount, no over/under allocation.

---

## 20. EXPENSE WALLET MOVEMENT

Expense=400 from Cash → Cash OUT=400.

Fix: Expense ko wallet ledger ke through route karo (same central ledger engine), inventory ko touch na kare (jab tak specifically stock-purchase-expense na ho).

**Verify:** Cash OUT=400, Expense=400, Diff=0.

---

## 21. SUPPLIER PAYMENT / SUPPLIER IN-OUT

Supplier payment=1000 split: Cash 500 + Bank 100 + Online 200 + Card 200 OUT.

Fix: Supplier payments bhi same central wallet-transaction engine use karein jo sales/refunds use karti hai — alag isolated logic na ho.

**Verify:** Total wallet OUT=1000=Supplier Payment, Diff=0, sab IDs linked.

---

## 22. SUPPLIER PURCHASE / STOCK IN

Fix: Inventory IN, Supplier Payable, aur Wallet OUT teeno ko **separate ledger effects** ke roop mein treat karo — credit purchase par fake wallet OUT create na ho (sirf actual payment hone par wallet OUT ho).

**Verify:** Inventory +10 IN sahi, Supplier ledger sahi, Wallet sirf real payment par affect ho.

---

## 23. SUPPLIER PAYMENT EDIT/DELETE/REFUND

Fix: Wallet-change pattern (Phase 8 jaisa) yahan bhi apply karo — old allocation full reconcile, new allocation clean apply.

**Verify:** No duplicate OUT, supplier ledger aur wallets sab correct.

---

## 24. WALLET TRANSFER / INTERNAL MOVEMENT

Cash→Bank 500: Cash OUT=500, Bank IN=500, income/sale na treat ho.

Fix: Transfer ko ek distinct transaction type banao jo sales/income reports mein count na ho, sirf wallet ledger mein reflect ho.

**Verify:** Global wallet total Diff=0, Transfer ID linked.

---

## 25. GLOBAL WALLET IN/OUT — SAB SOURCES CENTRAL LEDGER SE GUZRO

Fix: Codebase scan karke jahan bhi wallet balance directly modify ho raha hai (central ledger function ko bypass karke), un sab jagah **ek hi central "recordWalletMovement()" function** se route karo.

**Verify:** Har IN/OUT ke paas Source Transaction, Type, Reference ID, Amount, Wallet, Direction, User, Date/Time, Device, Sync Status, Parent Transaction, Audit Trail ho.

---

## 26. REPORTING — SAB EK HI SOURCE OF TRUTH SE

Fix: Salesman Report, Cashier Report, Supplier Report, Expense Report — sab ek hi central transaction/ledger table se derive hon. Agar koi report apna independent calculation kar rahi hai (jo dusri report se contradict karti hai) to usay central ledger query par migrate karo.

**Verify:** Koi bhi do reports contradictory balance na dikhayein.

**Critical Check (Phase 4A-i):** Sales Report, Financial Report, aur Inventory Report — teeno ko specifically negative/minus transactions ke saath test karo. Agar Wallet/Inventory Ledger mein value negative hai lekin report mein `0` aa raha hai, ye clamping bug hai (Phase 4A-i dekho) — sab reports scan karke fix karo, sirf ek report fix karke mat chhodo.

---

## 27. MULTIPLE DEVICES — FIX

Fix: Har transaction mein mandatory: Transaction ID, Device ID, User ID, Date/Time, Sync Status, Parent ID, Idempotency Key. Agar missing hai to schema/model mein add karo.

**Verify:** No duplicate transaction/inventory/wallet movement, no missing transaction, no silent overwrite.

---

## 28. OFFLINE MODE — FIX

Fix: Sale/Return/Refund/Edit/Delete/Payment/Inventory/Expense/Supplier — sab offline-capable hon, reconnect par same transaction dobara apply na ho (idempotency key check add karo).

**Verify:** Offline count = Synced count, no duplication.

---

## 29. SYNC ERRORS — FIX

Fix: Har transaction ko unique immutable ID + idempotency check do. Duplicate sync, retry duplication, partial sync, conflict — sab ko idempotency layer se handle karo.

**Verify:** Same transaction N baar retry karne se effect sirf 1 baar apply ho.

---

### 29A. REAL CRITICAL BUG FOUND — SYNC FAIL HONE PAR BHI LOCAL INVENTORY APPLY HO GAYI (NO FALLBACK/ROLLBACK)

**Observed (screenshot se confirm):**
"Cloud Handshake" panel mein ek transmission **STUCK** dikha raha hai:
```
SALE CREATE → 1 UPDATES → STUCK
CREATE SALES → ID: D9B76B → STUCK
Error: "null value in column 'sync_status' of relation 'sales' violates not-null constraint"
```
Yani **Sale record cloud/server par kabhi save/sync hi nahi hua** (constraint violation ki wajah se reject ho gaya). Lekin device ke local Movement History mein ye dikh raha tha:
```
Aug 20, 11:04 PM | shoaibzaynah | POS Return | +5 IN
```
**Koi sale exist hi nahi karti (server par), phir bhi inventory locally +5 IN ho gayi aur permanently record ban gaya — jaise transaction successful ho.**

**Root Cause:**
1. **Local-first write ho raha tha bina sync-outcome ka wait/fallback kiye.** Sale create hote hi turant local inventory update ho jati thi aur local history entry ban jati thi. Lekin jab sync **permanently fail** ho gaya (5 retries ke baad "STUCK" status), tab local state ko automatically rollback/revert nahi kiya gaya — jabke "Pending Changes sync in background. If a change fails 5 times, it is marked stuck" wala message khud confirm karta hai ke ye final-failure state hai, sirf temporary delay nahi.
2. **Root data bug bhi hai:** `sync_status` column `NOT NULL` hai lekin insert ke waqt is field mein `null` bhej diya gaya — yani sale-creation code khud hi ek invalid/incomplete record bana raha tha jo server-side kabhi accept hi nahi ho sakta tha.

**Is wajah se real symptom (jo aapne report kiya):** "5 items sale ki, wo sync nahi hui, lekin inventory phir bhi 5 add ho gayi" — **yani amounts aur inventory dono agge-peeche ho gaye kyunke local state aur server state kabhi match hi nahi hue, aur system ne is mismatch ko detect/correct nahi kiya.**

> **⚠️ NOTE — Ye poora 29A section sirf "diagnosis/root-cause" ke liye rakha gaya hai. Iska proposed fix (neeche wala "local-first + rollback-after-fail" approach) ko implement MAT karo — ye 29B se contradict karta hai aur 29B (all-or-nothing) hi is MD ka official/final rule hai. 29A ko sirf reference ke liye padho ke bug asal mein tha kya, actual fix ke liye seedha Phase 29B follow karo.**

<details>
<summary>Rejected/Superseded approach (reference only — DO NOT implement)</summary>

**Fix Requirement (mandatory, do hisso mein):**

**(a) Data-integrity fix (upstream cause):**
- Sale-create karte waqt `sync_status` field **kabhi bhi null na ho** — creation ke waqt hi default value (`'pending'`) explicitly set karo, taake NOT-NULL constraint kabhi violate na ho.

**(b) Sync-failure fallback/rollback:**
- Jab koi transaction **STUCK** status mein chali jaye, system ko local-applied effects ko automatically rollback/revert karna chahiye, ya flag karke reports se exclude karna chahiye.

~~Local-first writes acceptable hain (fast UX ke liye), lekin "local applied" aur "server confirmed" do alag states hone chahiye~~ — **Ye statement 29B ke against hai. Online mode mein local-first hi nahi hona chahiye (29B dekho). Offline mode mein hi optimistic local-apply allowed hai, wo bhi explicit PENDING state ke saath.**

</details>

**Data-integrity fix jo har haal mein zaroori hai (chahe 29A ho ya 29B):**
`sync_status` column kabhi bhi `null` insert na ho — creation ke waqt hi valid default explicitly set karo. Ye root-cause fix dono approaches mein common hai, isay karo chahe implementation 29B follow ho.

**Verify (root-cause part):** `sync_status` null-insert bug reproduce karke confirm karo ke ab kabhi null nahi jata.

**FINAL STATUS:** Is section (29A) ka status sirf "root cause correctly identified" tak simit hai. Actual fix/behavior/verification ke liye **Phase 29B ko authoritative source maano.**

---

### 29B. CORRECTED ARCHITECTURE DECISION (SUPERSEDES 29A's rollback-after-fact approach) — ALL-OR-NOTHING, NOT "APPLY THEN MAYBE ROLLBACK"

**Ye 29A ka better/final version hai — "apply-locally-then-rollback-if-fails" approach fundamentally galat/risky hai kyunke ye ek window chhodta hai jahan galat data temporarily "real" dikhta hai (reports, stock counts, screens sab par). Isay use nahi karna — neeche wala rule hi global standard hoga:**

**RULE — Connection state ke hisaab se do clean paths, koi teesra/hybrid path nahi:**

**(1) Jab device ONLINE ho:**
- Sale/Return/Refund/Edit/Delete/Adjustment — **koi bhi transaction ka Cloud/Server commit PEHLE hona chahiye.**
- Local Inventory movement, Wallet movement, aur History entry **sirf tab banein jab server ne commit confirm kar diya ho** (success response mila ho).
- Agar server commit **fail** ho jaye (kisi bhi wajah se — constraint error, network drop mid-request, timeout, validation fail) → **local par bhi kuch na bane** — na inventory move ho, na wallet move ho, na history entry bane, na sale record bane. **All-or-nothing.** User ko turant clear error dikhao ("Sale save nahi hui, dobara try karein") — silent partial-apply kabhi nahi.
- Ye current "local-first optimistic write" pattern ko **replace** karta hai jab connection available ho — optimistic local-apply sirf tab acceptable hai jab device genuinely OFFLINE ho (neeche point 2 dekho).

**(2) Jab device OFFLINE ho:**
- Transaction ko ek **Offline Queue** mein daalo (local pending-queue table/store), Inventory/Wallet ka effect **queue ke andar hi "pending" state mein reflect ho** (taake usi device par turant UI update dikhe — offline UX ke liye zaroori hai), **lekin ye clearly `UNSYNCED`/`PENDING` label ke saath ho, "confirmed final" ki tarah treat na ho.**
- Screen par **hamesha visible ek red/warning banner** ho: `"N unsynced transactions — will sync when online"` — jab tak queue khali na ho jaye ye banner disappear na ho. Ye banner Admin aur Cashier dono ko dikhe.
- Jab connection wapis aaye: queue se ek-ek transaction **order se (FIFO)** cloud par commit try ho.
  - Commit **success** → local entry `PENDING` se `CONFIRMED` ban jaye, banner ka count kam ho.
  - Commit **fail** (e.g. same constraint error) → transaction queue mein hi rahe `FAILED` status ke saath, banner count mein alag se dikhe (`"N unsynced, M failed — needs attention"`), **aur uska local Inventory/Wallet effect turant automatically reverse ho jaye** (kyunke jab tak cloud commit na ho, ye kabhi "real" nahi thi — ye sirf ek optimistic offline-preview thi).
- **Is design mein "STUCK after 5 retries phir bhi local effect permanent" wala scenario structurally hi exist nahi karta** — kyunke local effect hamesha explicitly `PENDING`/reversible hota hai jab tak cloud confirm na kare, `sync_status = null` jaisa data kabhi cloud tak pahunchta hi nahi (Online path mein commit hi nahi hota, Offline path mein queue se hi reject hoga aur turant revert hoga).

**Comparison — kyun ye behtar hai:**
| | 29A (apply-then-rollback) | 29B (all-or-nothing) |
|---|---|---|
| Online + fail | Local ban chuka hota hai, phir rollback try hota hai | Local kabhi banta hi nahi |
| Risk window | Haan — beech mein galat data reports/screens par dikh sakta hai | Nahi — ya to poora sahi, ya kuch nahi |
| Offline visibility | Implicit, user ko pata nahi chalta kitna pending hai | Explicit red banner, hamesha count visible |
| STUCK-forever scenario | Possible (jaisa screenshot mein hua) | Structurally prevent hota hai |

**Fix Requirement:**
1. Online-mode sale/return/refund/edit/delete/adjustment creation flow ko refactor karo: **server-commit-first, local-write-after-confirmation** — reverse current order agar abhi local-first hai.
2. Offline-mode ke liye ek proper **Offline Queue system** banao (agar nahi hai) jisme: Transaction payload, Status (`PENDING`/`SYNCING`/`CONFIRMED`/`FAILED`), Retry count, Timestamp, Device ID.
3. UI mein permanent **"N Unsynced" red banner** add karo jo queue-length se live-bound ho.
4. Queue-processing logic: FIFO order, success→confirm, fail→auto-revert local effect + mark `FAILED` in banner (not silently STUCK).
5. `sync_status` column ko null jaane hi na do — Online path mein ye sawal hi nahi uthega (commit hi cloud-first hai), Offline path mein queue apna internal status track karega, cloud-insert tabhi ho jab poora valid payload ho.

**Verify:**
```
ONLINE + server rejects → Local: NOTHING created (no inventory move, no wallet move, no history, no sale row)
OFFLINE + create sale → Local: PENDING state visible in queue + red banner "1 unsynced"
OFFLINE→ONLINE reconnect + queue commit success → PENDING → CONFIRMED, banner count -1
OFFLINE→ONLINE reconnect + queue commit fails → local effect auto-reverted, banner shows "1 failed — needs attention", NOT silently stuck
```

**FINAL STATUS:** PASS sirf tab jab (1) Online mode mein kabhi bhi local-only-no-cloud state exist na kare, (2) Offline queue hamesha visibly count ho (red banner), (3) Kisi bhi permanently-failed transaction ka local Inventory/Wallet effect auto-revert ho jaye, kabhi bhi "STUCK but still counted as real" state na bane.

---

## 30. MULTI-DEVICE CONFLICTS — FIX

Fix: Last-write-wins ko blindly use mat karo agar wo inventory/payment corrupt karta hai. Conflict Detection + Resolution + Transaction Ordering + User Resolution + Reconciliation layer banao.

**Verify:** Har unresolved conflict visible ho status ke saath: CONFLICT / RESOLVED / NEEDS VERIFICATION.

---

## 30A. NEGATIVE-QTY BILL — GRAND TOTAL ZERO CHECK

Specifically test karo: agar sirf ek negative-qty (minus) bill process hui ho (jaisa Phase 4A mein describe kiya), to us akele transaction ka:
```
Inventory Net Effect = +5 (IN)
Wallet Net Effect    = -(amount) (OUT)
```
Dono combined karke agar poore system (sab wallets + sab reports) ka "is transaction se grand total contribution" nikala jaye to wo **0 aana chahiye nahi — balance honi chahiye ke Inventory ka plus aur Wallet ka minus dono independently apni-apni jagah sahi reflect ho rahe hon**, aur agar starting state se compare karo (Phase 31 ki tarah) to overall reconciliation Diff=0 aaye.

**Verify:** Wallet Ledger, Salesman Report, Cashier Report, Sales Report — in **sab jagah** is transaction ka minus effect dikhna chahiye, sirf Inventory table mein plus dikhna kaafi nahi. Kahin bhi ek jagah minus missing mila to fix incomplete hai.

---

## 31. ALL-BILLS DELETE / ZERO TEST — FIX KE BAAD YE PASS HONA CHAHIYE

Starting state record karo → sab complex transactions run karo (sales, discounts, returns, refunds, edits, expenses, supplier payments, offline, multi-device, sync, deletes, reversals) → sab reverse/delete karo → compare.

**Fix tabhi complete mana jayega jab:**
```
Final Inventory = Starting Inventory
Final Cash = Starting Cash
Final Bank = Starting Bank
Final Online = Starting Online
Final Card = Starting Card
Final Supplier Balances = Starting Supplier Balances
Difference = 0 (har jagah)
```
Agar koi diff nikle to us exact transaction source ko trace karke fix karo.

---

## 32. GLOBAL RECONCILIATION ENGINE — BANAO (agar nahi hai)

Ek reconciliation engine banao jo har entity (Inventory, Wallet, Sales, Returns, Edited Bills, Deleted Bills, Supplier, Expenses) ke liye:
```
Expected | Actual | Difference | Source | Transaction ID | Status
```
generate kare. Ye engine hi "PASS/FAIL" decide karne ka single source of truth banega.

---

## 33. AUDIT TRAIL — COMPLETE KARO

Fix: Har event type (Created, Edited, Returned, Refunded, Deleted, Reversed, Synced, Failed, Retried, Payment Changed, Wallet Changed, Item Added/Removed, Quantity/Price/Discount Changed, Salesman Changed, Cashier/Operator, Expense CRUD, Supplier Payment CRUD, Inventory Adjustment, Restock) ke liye: Transaction ID, Parent ID, Action ID, Previous State, New State, Movement, User, Salesman, Cashier, Device, Date/Time, Sync Status — record karo agar missing hai.

---

## 34. ARCHITECTURE-LEVEL FIX (Individual Bug Patch Nahi)

Agar codebase mein multiple jagah `stock -= qty`, `wallet += amount`, `wallet -= amount` scattered hain:

**Fix approach:**
1. Ek Central Transaction/Ledger Architecture design karo.
2. Sab scattered mutations ko is central ledger function ke through route karo.
3. Reversal Architecture (Phase 16) isi ledger par based ho.
4. Idempotency, Sync, Audit, Reporting — sab isi single source of truth se connect hon.

Working functionality ko unnecessarily rewrite mat karo — sirf jo global ledger ko bypass kar raha hai usay migrate karo.

---

## 35–37. IMPLEMENTATION PROCESS (har fix ke liye follow karo)

Har fix ke liye sequence:
**INSPECT → IMPLEMENT → TEST → RECONCILE → VERIFY → REPORT**

Har fix ke baad ye mini-report do:
1. Kya fix kiya (root cause + solution)
2. Files/Models/APIs/Frontend changed
3. Inventory Impact (Expected vs Actual IN/OUT, Diff)
4. Wallet Impact (Expected vs Actual IN/OUT, Diff)
5. Sales/Salesman/Cashier/Supplier/Expense Impact
6. Sync Impact
7. Tests Run/Passed/Failed
8. Reconciliation (Expected/Actual/Diff)
9. Remaining Issues / Risks
10. **Final Status: PASS / PARTIAL / FAILED / NEEDS VERIFICATION**

**PASS sirf tab likhna hai jab actual test+reconciliation se prove ho — sirf code likh dena PASS nahi hai.**

Example:
```
Expected = 100, Actual = 99  → FAIL
Expected Inventory = 100, Actual = 101 → FAIL
```
Har mismatch ka exact source dhoondo aur usay fix karo, phir dobara verify karo.

---

## 38. FINAL GLOBAL VERIFICATION (sab fixes ke baad)

Sab phases fix hone ke baad, complete system par ye final check chalao:

- **Inventory Reconciliation**: har product, Opening+IN-OUT=Current, Diff=0
- **Wallet Reconciliation**: har wallet, Opening+IN-OUT=Current, Diff=0
- **Sale→Inventory OUT+Wallet IN, Return→Inventory IN+Wallet OUT, Refund→correct OUT+conditional IN, Delete→complete net reversal, Edit→only actual diff** — sab verify
- **Salesman/Cashier/Supplier/Expense Reconciliation** — report totals = actual ledger totals
- **Multi-Wallet, Edit-Bill, Delete/Reversal Reconciliation** — before vs after 100% identical
- **All-Bills Zero Test** — Final = Starting, Diff=0 everywhere
- **Offline + Multi-Device** — no duplicate/missing/silent-overwrite
- **Data Integrity** — no duplicate transactions/movements, no orphan records, no broken references

Agar kuch verify nahi ho pata → status = **NEEDS VERIFICATION**, aur usay resolve kiye bina "system fixed" mat kaho.

---

## 39. FINAL SYSTEM HEALTH CHECKLIST

Har module ka status likho (fix ke baad, actual test se):

```
Inventory IN/OUT        = PASS/PARTIAL/FAIL
Wallet IN/OUT            = PASS/PARTIAL/FAIL
Sale                     = PASS/PARTIAL/FAIL
Return                   = PASS/PARTIAL/FAIL
Refund                   = PASS/PARTIAL/FAIL
Discount                 = PASS/PARTIAL/FAIL
Edit Bill                = PASS/PARTIAL/FAIL
Item Add/Remove          = PASS/PARTIAL/FAIL
Price Change             = PASS/PARTIAL/FAIL
Delete/Reversal          = PASS/PARTIAL/FAIL
Multi-Wallet             = PASS/PARTIAL/FAIL
Salesman Reporting       = PASS/PARTIAL/FAIL
Cashier Reporting        = PASS/PARTIAL/FAIL
Expense Wallet           = PASS/PARTIAL/FAIL
Supplier Wallet          = PASS/PARTIAL/FAIL
Supplier Ledger          = PASS/PARTIAL/FAIL
Wallet Transfer          = PASS/PARTIAL/FAIL
Offline Mode             = PASS/PARTIAL/FAIL
Multi-Device             = PASS/PARTIAL/FAIL
Sync                     = PASS/PARTIAL/FAIL
Audit Trail              = PASS/PARTIAL/FAIL
Reconciliation           = PASS/PARTIAL/FAIL
Historical Data          = PASS/PARTIAL/FAIL
Users/Roles/Permissions  = PASS/PARTIAL/FAIL
Session Management       = PASS/PARTIAL/FAIL
-----------------------------------------------
Overall POS              = PASS/PARTIAL/FAIL
```

**Golden Rule:** Har PASS actual reconciliation se proven honi chahiye. Ek bhi mismatch mile to us module ka status FAIL/PARTIAL rahega jab tak dobara fix + verify na ho.

---

## 39A. USER MANAGEMENT, ROLES & PERMISSIONS — FIX KARO (NEW PHASE)

### Known Bug (reported)
User ko **Block** kiya gaya lekin wo user abhi bhi **login kar pa raha hai**. Yani Block/Delete/Session-revoke properly enforce nahi ho raha — login check block-status ko verify nahi kar raha, ya session already-active hone ki wajah se bypass ho raha hai.

**Fix Requirement:**
- Har login attempt par user ka current status (`active` / `blocked` / `deleted`) **real-time check** ho — cached/stale session data par bharosa mat karo.
- User ko block karte hi uske **saare active sessions turant invalidate/kill** hon (session table se force-logout / token-revoke) — sirf naya login rokna kaafi nahi, existing session bhi turant khatam ho.
- Delete kiye gaye user ka login **permanently reject** ho, aur uska data/history (audit trail ke liye) delete nahi hona chahiye — sirf account access revoke ho (soft-delete pattern use karo, hard-delete se audit trail toot jayega — Phase 33 se conflict hoga).

**Verify:**
- Blocked user → login attempt → **reject** (expected), agar login ho raha hai → FAIL, session/login-check logic fix karo.
- Blocked user ka already-open session (dusre device/tab par) → **turant expire** ho jaye (real-time ya next-request par).
- Deleted user → login → reject, lekin uski purani sales/transactions ka audit trail (salesman/cashier name) intact rahe.

---

### Roles & Permissions — Global Secure Structure

System mein kam-se-kam ye 3 roles clearly define aur enforce karo (agar codebase mein ye separation missing/leaky hai to fix karo):

**1. Admin**
- Full access: Users create/edit/block/delete, Roles/Permissions assign, Wallets/Inventory/Reports (sab), Settings, Supplier, Expense, Discount rules, Price change, Bill edit/delete, Refunds/Returns approval, Audit trail view (full), Multi-device/session management.
- Sirf Admin hi doosre Admins ya Managers ko create/block/delete kar sakta hai.

**2. Manager**
- Sales, Returns, Refunds, Discounts, Bill Edit/Delete (apni branch/store ke liye), Inventory adjustments, Expense entry, Supplier payments, Reports (apni scope ke), Cashier accounts create/manage (block/unblock cashiers only — Admin/Manager accounts touch nahi kar sakta).
- Settings/global config change **nahi** kar sakta (Admin-only).
- Doosre Managers ya Admin ko block/delete **nahi** kar sakta.

**3. Cashier**
- Sale create, Payment collect (wallet select), apna khud ka session/password change.
- Return/Refund/Discount/Bill-Edit/Delete — **sirf agar explicitly permission di gayi ho**, warna in actions ke liye Manager/Admin approval mandatory ho.
- Reports: sirf apni khud ki sales/collections dekh sake, doosre cashiers ka data nahi.
- Users create/block/delete, Settings, Supplier, Expense approval — **access nahi**.

**Fix Requirement:** Ye permission boundaries **backend/API level par enforce** hon, sirf frontend UI hide karna kaafi nahi (agar abhi sirf UI-level hiding hai to ye security gap hai — fix karo: har sensitive action ka API endpoint role-check kare).

**Verify:** Cashier login karke Admin/Manager-only endpoints direct API call se try kare → **reject (403)** hona chahiye. Har role ka access matrix test karo.

---

### Password Change

**Fix Requirement:**
- User apna password khud change kar sake (current password verify karke).
- Admin/Manager kisi bhi user (apni permission scope ke andar) ka password reset kar sake.
- Password change hote hi us user ke **saare purane active sessions invalidate** hon (security best practice — agar abhi nahi ho raha to fix karo).
- Password hashed store ho (plain-text kabhi nahi) — verify karo codebase mein.

**Verify:** Password change → purane sessions expire → naye password se hi login ho.

---

### Session Management

**Fix Requirement:**
- Har session: User ID, Device ID, Login Time, Last Activity, Status (active/expired/revoked) track ho.
- Admin ko ek "Active Sessions" view milni chahiye jahan se wo kisi bhi user ka session manually revoke kar sake.
- Multi-device login policy clear ho (allowed ya restricted — jo bhi business rule ho, consistently enforce ho).
- Session timeout/expiry properly enforce ho (agar configured hai).

**Verify:** Session list accurate ho, manual revoke turant effective ho, expired session se koi bhi action allowed na ho.

---

### User Delete vs Block — Difference Clearly Enforce Karo

- **Block** = temporary, login disabled, data/history intact, unblock se wapis access mile.
- **Delete** = permanent access removal (soft-delete), login permanently disabled, lekin transaction/audit history preserve rahe (Phase 33 ke audit trail requirement se conflict na ho).

**Verify:** Block→Unblock cycle test karo (access wapis aana chahiye), Delete test karo (access kabhi wapis na aaye, history phir bhi reports mein dikhe).

---

### PHASE FINAL REPORT (mandatory)

1. Bug Found: Blocked user still able to login — Root Cause
2. Files/Auth-Middleware/Session-Table Changed
3. Role Permission Matrix (Admin/Manager/Cashier) — Before vs After
4. API-level enforcement added kahan-kahan
5. Tests Run: Block→Login, Delete→Login, Session Revoke, Password Change→Session Kill, Role-boundary API tests
6. Tests Passed/Failed
7. Remaining Issues
8. Final Status: PASS/PARTIAL/FAILED/NEEDS VERIFICATION

---

## FINAL INSTRUCTION

Ye document **fixing spec** hai — implementation isi ke against verify honi chahiye:

1. Har jagah jahan spec se system ka behavior match nahi karta → **fix karo**.
2. Fix ke baad har baseline scenario (Phase 1–31) ko actual test se chalao.
3. Expected vs Actual compare karo — Diff≠0 to fix incomplete hai, dobara karo.
4. Sab phases complete hone ke baad Phase 38–39 ka Final Global Verification chalao.
5. Sirf tab "system fixed" bolo jab **FINAL INVENTORY = STARTING INVENTORY**, **FINAL EVERY WALLET = STARTING WALLET**, **FINAL SUPPLIER BALANCE = STARTING BALANCE**, aur **ALL REPORTS = ACTUAL LEDGER** — sab prove ho jayein.

Koi module isolated plus/minus se accept nahi hoga agar wo global ledger ko bypass karta hai.
