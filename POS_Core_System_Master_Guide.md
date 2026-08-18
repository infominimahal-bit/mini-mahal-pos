# ROLE AND RESPONSIBILITY

Act as a **Senior POS System Architect, Senior Full-Stack Developer, Database Architect, Financial Systems Expert, Inventory Expert, QA Engineer, and UX Designer**.

Build, review, and improve a **production-level POS, Inventory, Sales, Payment, Refund, Customer, Receipt, Reporting, and Audit Management System**.

The system must be designed for real business use.

The highest priority is:

1. **Financial accuracy**
2. **Inventory accuracy**
3. **Data consistency**
4. **No duplicate transactions**
5. **Complete transaction history**
6. **Correct reports**
7. **Clear user experience**
8. **Safe editing, cancellation, and refund operations**
9. **Full auditability**
10. **Atomic database operations**

Never sacrifice data accuracy for UI simplicity.


---

# 🚨 ZAYNAHSPOS STRICT MASTER ARCHITECTURE OVERRIDES 🚨
> **CRITICAL:** The following rules OVERRIDE any generic concepts in this document. This system is heavily offline-first and database-trigger driven. If you violate these rules, the system will break.

1. **NO PRISMA OR DIRECT DB STRINGS:** Prisma ORM, raw Postgres connection strings (`DATABASE_URL`), and direct DB Dashboard connections are **BANNED**. All schema changes MUST go through the Supabase Management API via HTTP/curl and be logged in `SUPER_MASTER_SCHEMA.sql`.
2. **OFFLINE-FIRST QUEUE (localDb):** Never write financial or inventory data directly to Supabase via `supabase-js`. ALL data mutations MUST route through `localDb.ts` (Dexie) and `queueOp()` so they are safely synced by the `SyncEngine` when internet is available.
3. **SINGLE-TENANT ONLY:** This is a 1 Clone = 1 Shop system. `workspace_id` and `shift_id` DO NOT EXIST and must never be used or added.
4. **SHARED MODULES ONLY:** Do not create custom buttons, modals, or drag-and-drop lists. You MUST use the pre-built shared UI (`src/shared/ui/`) and modules (`src/shared/modules/`). Duplicate UI implementations are banned.
5. **ROW TOMBSTONES (DELETES):** Deletions for sales and financial records use hard deletes in the table, but the DB trigger `record_row_tombstone()` catches them to prevent offline-sync resurrections. Never use a `status = 'cancelled'` column for bills.

---

---

# CORE SYSTEM PRINCIPLE

The system must treat the following as connected but separate accounting domains:

```text
SALE
INVENTORY
PAYMENT
CUSTOMER BALANCE
CASH
CARD
WALLET
BANK
REFUND
ADJUSTMENT
AUDIT LOG
```

Every action must create the correct records.

Never directly change balances or stock without a transaction record.

The system must always answer:

```text
What happened?
When did it happen?
Who performed it?
Which sale was affected?
Which products were affected?
How much stock changed?
How much money changed?
Which account changed?
Why did it change?
What was the previous state?
What is the new state?
```

---

# COMPLETE SYSTEM MODULES

Build the following modules:

```text
1. Dashboard

2. POS / New Sale

3. Product Search

4. Product Categories

5. Cart

6. Customer Selection

7. Discounts

8. Taxes

9. Payment

10. Mixed Payment

11. Save Sale

12. Sale Preview

13. Invoice

14. Receipt

15. Print Receipt

16. Sale Details

17. Sale Edit

18. Sale Cancellation

19. Full Refund

20. Partial Refund

21. Inventory Management

22. Inventory Transactions

23. Cash Management

24. Card Transactions

25. Wallet Transactions

26. Customer Ledger

27. Payment History

28. Refund History

29. Sales Reports

30. Inventory Reports

31. Financial Reports

32. Customer Reports

33. Audit Logs

34. User Activity

35. Settings
```

All modules must remain synchronized.

---

# PART 1 — DASHBOARD

The dashboard must display real-time business information.

Show:

```text
Today's Sales

Today's Revenue

Today's Refunds

Today's Net Sales

Today's Profit

Today's Number of Orders

Cash Sales

Card Sales

Wallet Sales

Credit Sales

Outstanding Customer Balance

Low Stock Products

Out of Stock Products

Recent Sales

Recent Refunds
```

Important calculation:

```text
Gross Sales
- Refunds
= Net Sales
```

Do not mix:

```text
Revenue
Cash Received
Profit
Outstanding Credit
Refund Amount
```

These must remain separate.

Dashboard numbers must match database records exactly.

---

# PART 2 — POS / NEW SALE TAB

The POS screen must be fast and easy.

Layout:

```text
LEFT SIDE
Product Categories
Product Search
Product Grid

RIGHT SIDE
Customer
Cart Items
Quantity Controls
Discount
Tax
Subtotal
Total
Payment
Save Sale
Preview
```

The user should be able to:

```text
Search product by:

Product Name
SKU
Barcode
Category
```

Selecting a product adds it to the cart.

If the same product is selected again:

```text
Increase quantity
```

Do not create unnecessary duplicate cart rows unless variants or prices are different.

---

# PART 3 — PRODUCT AND INVENTORY VALIDATION

Before adding a product to a sale:

Check:

```text
Product exists

Product is active

Product is available

Inventory is sufficient

Product is not deleted
```

Example:

```text
Available Stock = 5

Customer wants = 6
```

System must prevent:

```text
Sale of 6 ❌
```

Show:

```text
Only 5 items available in stock.
```

If negative stock is supported, it must be controlled by settings and permissions.

Default behavior:

```text
Negative stock = NOT ALLOWED
```

---

# PART 4 — CART

Each cart item must contain:

```text
Product ID
Product Name
SKU
Unit Price
Quantity
Discount
Tax
Line Total
Available Stock
```

Calculation:

```text
Line Total

=
(Unit Price × Quantity)

- Line Discount

+ Tax
```

Example:

```text
Product A

Price = 100
Quantity = 2

Subtotal = 200

Discount = 20

Tax = 10

Final = 190
```

All totals must use precise decimal calculations.

Do NOT use unsafe floating-point calculations for money.

Use:

```text
Decimal
or
integer minor currency units
```

Example:

```text
100.50
```

must remain accurate.

---

# PART 5 — SALE CALCULATION

The system must calculate:

```text
Subtotal

Item Discount

Order Discount

Tax

Other Charges

Grand Total

Paid Amount

Remaining Amount

Change Amount
```

Formula:

```text
Grand Total

=
Subtotal
- Discounts
+ Taxes
+ Additional Charges
```

Example:

```text
Subtotal = 1,000

Discount = 100

Tax = 90

Grand Total = 990
```

The displayed value, saved value, receipt value, sale detail value, and report value must all be identical.

There must be one trusted calculation source.

Never calculate totals differently in:

```text
POS
Receipt
Sale Detail
Reports
Dashboard
Database
```

---

# PART 6 — CUSTOMER SELECTION

The user can select:

```text
Walk-in Customer
or
Registered Customer
```

Customer information:

```text
Customer ID

Name

Phone

Email

Address

Current Balance

Credit Limit
```

If credit is used:

```text
Customer Balance must update correctly.
```

Example:

```text
Sale Total = 500

Customer Pays = 300

Remaining = 200
```

Customer Ledger:

```text
Opening Balance

Sale / Debit +500

Payment / Credit -300

Outstanding = 200
```

Every change must have a ledger entry.

Never directly overwrite customer balance.

---

# PART 7 — PAYMENT SYSTEM

Support:

```text
Cash

Card

Wallet

Bank Transfer

Customer Credit

Mixed Payment
```

Every payment method must have its own transaction record.

Example:

```text
Sale Total = 500

Cash = 200

Card = 200

Wallet = 100
```

Total:

```text
200 + 200 + 100 = 500
```

System must validate:

```text
Total Payment = Required Amount
```

For overpayment:

Example:

```text
Total = 500

Cash Received = 600

Change = 100
```

Financial movement:

```text
Cash Received = +600

Cash Change Returned = -100

Net Cash Sale = +500
```

Do not simply store:

```text
Cash = 500
```

if actual cash received and change are important to accounting.

---

# PART 8 — SALE SAVE FLOW

When the user clicks:

```text
SAVE SALE
```

The system must execute the following safely.

## STEP 1 — VALIDATE

Validate:

```text
Cart is not empty

Products exist

Stock is available

Prices are valid

Quantities are valid

Discounts are valid

Tax is valid

Payment is valid

Customer is valid

Total calculation is correct
```

---

## STEP 2 — CREATE SALE

Create:

```text
Sale ID

Invoice Number

Customer

User

Branch / Store

Date and Time

Subtotal

Discount

Tax

Grand Total

Paid Amount

Due Amount

Status
```

Example status:

```text
COMPLETED
PARTIALLY_PAID
CREDIT
```

---

## STEP 3 — CREATE SALE ITEMS

Every product becomes a Sale Item.

Example:

```text
Sale #1001

Product A
Quantity: 1
Price: 100
Total: 100

Product B
Quantity: 2
Price: 200
Total: 400
```

---

## STEP 4 — UPDATE INVENTORY

For each product:

```text
Stock = Stock - Sold Quantity
```

Create inventory transaction:

```text
Type: SALE

Product ID

Quantity Change: -2

Previous Stock

New Stock

Reference: Sale ID
```

---

## STEP 5 — CREATE PAYMENT TRANSACTIONS

Example:

```text
Cash Payment = 300

Card Payment = 200
```

Create separate records:

```text
PAYMENT #1
Method: CASH
Amount: 300

PAYMENT #2
Method: CARD
Amount: 200
```

---

## STEP 6 — UPDATE FINANCIAL ACCOUNTS

Example:

```text
Cash Ledger +300

Card Ledger +200
```

If credit exists:

```text
Customer Ledger +Due Amount
```

---

## STEP 7 — CREATE AUDIT LOG

Example:

```text
Action: SALE_CREATED

User: Admin

Sale ID: 1001

Amount: 500

Date/Time

IP / Device if available
```

---

## STEP 8 — COMMIT EVERYTHING

All operations must happen inside one database transaction.

```text
BEGIN TRANSACTION

Validate

Create Sale

Create Sale Items

Update Inventory

Create Inventory Ledger

Create Payments

Update Financial Ledgers

Update Customer Ledger

Create Audit Log

COMMIT
```

If anything fails:

```text
ROLLBACK
```

No partial data.

---

# PART 9 — SALE SUCCESS PAGE

After successfully saving a sale, show:

```text
SALE COMPLETED SUCCESSFULLY
```

Display:

```text
Invoice Number

Sale Date

Customer

Total Amount

Paid Amount

Due Amount

Payment Method
```

Buttons:

```text
View Sale

Preview Invoice

Print Receipt

Download Receipt

New Sale
```

Prevent accidental double-save.

After successful save:

```text
Disable repeated submit request
```

Use:

```text
Idempotency Key
Unique Request ID
```

---

# PART 10 — SALE PREVIEW

Before final confirmation, provide a preview.

The preview must show exactly what will be saved.

Display:

```text
Invoice Number

Customer

Products

Quantity

Price

Discount

Tax

Subtotal

Grand Total

Payment Breakdown

Paid

Due

Change

Notes
```

Preview values must match final saved values.

The system must not show one total in preview and another after saving.

---

# PART 11 — RECEIPT / INVOICE

After sale completion, generate a receipt.

Receipt must contain:

```text
Business Name

Business Logo

Business Address

Phone

Tax Number if applicable

Invoice Number

Sale Date

Sale Time

Cashier / User

Customer

Product List

Quantity

Unit Price

Discount

Tax

Subtotal

Grand Total

Paid Amount

Due Amount

Change

Payment Methods

Thank You Message
```

Example:

```text
--------------------------------

ABC STORE

Invoice: INV-1001

Date: 18-08-2026
Time: 12:30 PM

Customer: Walk-in

--------------------------------

Product A

1 × 100 = 100

Product B

2 × 200 = 400

--------------------------------

Subtotal: 500

Discount: 0

Tax: 0

TOTAL: 500

Cash: 500

Paid: 500

Due: 0

--------------------------------

Thank you for shopping!
--------------------------------
```

Receipt values must come from the final saved transaction.

Never recalculate the receipt using different logic.

---

# PART 12 — SALE LIST

Create a complete Sales List page.

Columns:

```text
Invoice Number

Date

Customer

Items

Total

Paid

Due

Refunded

Net Amount

Payment Status

Sale Status

User

Actions
```

Actions:

```text
View

Preview

Print

Edit

Refund

Cancel
```

Actions must depend on sale status and user permissions.

Example:

A fully refunded sale:

```text
Edit ❌

Refund Again ❌

View ✅

Print Refund Receipt ✅
```

---

# PART 13 — SALE DETAIL PAGE

Every sale must have a detailed page.

Show:

## SALE INFORMATION

```text
Invoice Number

Sale ID

Date

Time

Customer

Cashier

Branch
```

## PRODUCTS

For every item:

```text
Product

SKU

Original Quantity

Current Sold Quantity

Refunded Quantity

Remaining Refundable Quantity

Price

Discount

Tax

Line Total
```

## PAYMENT

Show:

```text
Payment Method

Amount

Payment Status

Transaction Reference
```

For mixed payments:

```text
Cash = 200

Card = 300
```

Show separately.

## REFUND HISTORY

Show:

```text
Refund ID

Date

Product

Quantity

Amount

Refund Method

Reason

User
```

## EDIT HISTORY

Show:

```text
Version

Date

User

What Changed

Old Value

New Value
```

## INVENTORY HISTORY

Show inventory movements related to the sale.

## AUDIT HISTORY

Show every important action.

---

# PART 14 — EDIT SALE (TWO-PHASE ATOMIC RULE)

Editing a completed sale is a sensitive operation.
The system must NEVER use delta-based math (calculating difference between old and new quantities). Doing so creates fatal math errors for percentage discounts, taxes, and split payments.

The system MUST use the **Two-Phase Atomic Pattern**:

## PHASE 1: CREATE NEW SALE
Treat the edit as a completely new transaction.
- Create new sale record
- Deduct full new inventory
- Take new full payment

## PHASE 2: DELETE OLD SALE
Immediately after Phase 1 succeeds:
- Cancel the old sale record
- Restore all old inventory (Inventory Adjustment / Return)
- Refund or reverse the old payment

## ROLLBACK ON FAILURE
If Phase 2 fails, the system must rollback Phase 1 to prevent double deduction.

This ensures:
- Math is always 100% accurate.
- Split payments and complex taxes recalculate correctly.
- Inventory is perfectly protected.
- Data never corrupts due to partial delta failures.

---

# PART 16 — EDIT CONFIRMATION SCREEN

Before saving an edit, show:

```text
SALE CHANGES SUMMARY
```

Example:

```text
REMOVED:

Product A

Quantity: 1

Inventory:
+1

Amount:
-100


ADDED:

Product C

Quantity: 2

Inventory:
-2

Amount:
+400


OLD TOTAL:
500

NEW TOTAL:
800

CUSTOMER MUST PAY:
300
```

The user must confirm before applying the changes.

---

# PART 17 — FULL REFUND

A full refund must preserve the original sale.

Do NOT delete the sale.

Original:

```text
Sale Total = 500

Payment = Cash
```

Full refund:

```text
Sale Status = REFUNDED
```

Inventory:

```text
Return all refundable quantities.
```

Financial:

```text
Refund customer according to selected refund method.
```

Create:

```text
Refund Record

Refund Items

Inventory Transactions

Financial Refund Transaction

Audit Log
```

---

# PART 18 — PARTIAL REFUND

The user must select:

```text
Product

Refund Quantity

Refund Reason

Refund Amount

Refund Method
```

Example:

Original:

```text
Product B

Sold = 2

Price = 200
```

Customer returns:

```text
Quantity = 1
```

System:

```text
Inventory +1

Refund = 200
```

Remaining:

```text
Sold Quantity = 1

Refundable Quantity = 1
```

The system must prevent:

```text
Refunding 3 items ❌

Refunding same item twice ❌

Refund amount greater than paid amount ❌
```

---

# PART 19 — REFUND FLOW

Refund screen must show:

```text
Original Invoice

Customer

Original Payment

Sold Items

Previously Refunded Items

Remaining Refundable Quantity

Maximum Refund Amount
```

User selects:

```text
Items

Quantity

Refund Amount

Refund Method

Reason
```

System validates.

Then:

```text
Preview Refund
```

Preview:

```text
Items Returned

Inventory Increase

Refund Amount

Refund Method

Financial Account Affected
```

After confirmation:

```text
Process Refund
```

Generate:

```text
Refund ID

Refund Receipt
```

---

# PART 20 — CANCEL SALE

Cancellation is different from refund.

Recommended rule:

```text
Completed sale with customer payment
=
Use refund or controlled reversal.

Unpaid/draft sale
=
Cancel without financial refund.
```

Never permanently erase important completed transactions.

Use status:

```text
CANCELLED
```

Create reversal records.

Cancellation must not be allowed twice.

**(ZaynahsPOS Specific Rule: Cancellations/Voids must be handled via hard deletes using `row_tombstones` for offline audit safety. Do not use a 'CANCELLED' status for sales.)**

**Note on Drafts:**
Unpaid/draft sales are merely saved carts (`status: 'pending'`). They never touch inventory and are excluded from financial reports. They do not need refunds or cancellations.

---

# PART 21 — INVENTORY MODULE

Inventory page must show:

```text
Product

SKU

Category

Current Stock

Reserved Stock if applicable

Available Stock

Low Stock Level

Stock Status

Inventory Value
```

Inventory movements:

```text
initial

stock_in

sale

return

adjustment

adjustment_out
```

Each movement must show:

```text
Date

Product

Type

Previous Quantity

Change

New Quantity

Reference

User
```

---

# PART 22 — CASH MANAGEMENT

Cash must use a ledger.

Never only store:

```text
Current Cash = 10,000
```

Store movements:

```text
Opening Cash

Cash Sale

Cash Refund

Cash Expense

Cash Withdrawal

Cash Deposit

Closing Cash
```

Example:

```text
Opening = 10,000

Cash Sale = +500

Cash Refund = -100

Expense = -200

Closing = 10,200
```

Formula:

```text
Opening
+ Money In
- Money Out
= Current / Closing Cash
```

---

# PART 23 — CARD, WALLET AND BANK LEDGERS

Every account must maintain independent transaction history.

Example:

```text
CARD LEDGER

Sale Payment +500

Refund -100

Net +400
```

Wallet:

```text
Wallet Payment

Wallet Refund

Wallet Adjustment
```

Do not combine Cash and Card balances.

---

# PART 24 — CUSTOMER LEDGER

Customer Ledger must show:

```text
Date

Reference

Transaction Type

Debit

Credit

Running Balance
```

Transaction types:

```text
SALE

PAYMENT

REFUND

ADJUSTMENT

CREDIT
```

Example:

```text
Opening Balance = 0

Sale = +500

Payment = -300

Balance = 200
```

Every customer balance must be calculated from transactions or maintained safely from ledger movements.

---

# PART 25 — REPORTING SYSTEM

Create accurate reports.

## SALES REPORT

Filters:

```text
Today

Yesterday

This Week

This Month

Custom Date Range

Customer

Product

Category

Cashier

Payment Method

Branch
```

Show:

```text
Number of Sales

Gross Sales

Discount

Tax

Refund Amount

Net Sales

Paid Amount

Due Amount
```

Formula:

```text
Net Sales

=
Gross Completed Sales
- Refunds
- Cancelled/Reversed Sales according to accounting rules
```

---

# PAYMENT REPORT

Show separately:

```text
Cash Sales

Card Sales

Wallet Sales

Bank Sales

Credit Sales

Mixed Payments

Refunds by Payment Method
```

Never count:

```text
Cash + Card + Wallet
```

incorrectly for mixed payments.

---

# REFUND REPORT

Show:

```text
Refund ID

Original Invoice

Customer

Product

Quantity

Refund Amount

Refund Method

Reason

User

Date
```

Totals:

```text
Total Refund Amount

Refund Count

Refund by Product

Refund by User

Refund by Payment Method
```

---

# PRODUCT SALES REPORT

For each product:

```text
Quantity Sold

Quantity Refunded

Net Quantity Sold

Gross Sales

Refund Amount

Net Sales
```

Formula:

```text
Net Quantity

=
Sold Quantity
- Refunded Quantity
```

---

# INVENTORY REPORT

Show:

```text
Opening Stock

Purchased

Sold

Refunded

Adjusted

Transferred

Closing Stock
```

Formula:

```text
Opening Stock
+ Incoming
- Outgoing
= Closing Stock
```

---

# PROFIT REPORT

Profit must not be confused with revenue.

Example:

```text
Revenue = 10,000

Cost of Goods Sold = 6,000

Gross Profit = 4,000
```

Refunds must correctly reverse revenue and relevant cost calculations.

Use accurate inventory costing according to the configured accounting method.

---

# PART 26 — SALE STATUS

Use controlled states.

```text
DRAFT

COMPLETED

PARTIALLY_PAID

PARTIALLY_REFUNDED

REFUNDED

CANCELLED
```

Do not allow invalid transitions.

Example:

```text
REFUNDED
→ REFUND AGAIN ❌
```

---

# PART 27 — PAYMENT STATUS

Use:

```text
UNPAID

PARTIALLY_PAID

PAID

PARTIALLY_REFUNDED

REFUNDED

REVERSED
```

---

# PART 28 — DUPLICATE PREVENTION

Protect against:

```text
Double-click

Double API request

Slow network

Browser retry

Page refresh

Two users clicking refund

Repeated save request
```

Use:

```text
Idempotency Keys

Unique Transaction IDs

Database Constraints

Row Locking where necessary

Atomic Transactions
```

**(ZaynahsPOS Specific Rule: All transactions must first be written to the localDb (Dexie) queue. Queue merge rules must be respected to ensure offline-first safety.)**

Example:

```text
Refund Request ID:
REF-1001-UNIQUE
```

If processed already:

```text
Do not process again.

Return the existing transaction result.
```

---

# PART 29 — CONCURRENT ACTION PROTECTION

If two users try to:

```text
Edit same sale

Refund same item

Cancel same sale
```

the system must prevent conflicting updates.

Use:

```text
Transaction Locking

Optimistic Version Control

Row Locking

Concurrency Checks
```

The second user should see:

```text
This sale was modified by another user.
Please refresh and review the latest version.
```

---

# PART 30 — AUDIT LOG

Log every sensitive action.

Actions:

```text
SALE_CREATED

SALE_EDITED

SALE_CANCELLED

ITEM_ADDED

ITEM_REMOVED

QUANTITY_CHANGED

PRICE_CHANGED

DISCOUNT_CHANGED

PAYMENT_CHANGED

PAYMENT_METHOD_CHANGED

FULL_REFUND

PARTIAL_REFUND

INVENTORY_ADJUSTMENT
```

Each audit record:

```text
Audit ID

Action

User

Date

Time

Reference Type

Reference ID

Old Data

New Data

Reason
```

---

# PART 31 — PERMISSIONS

Create role-based permissions.

Example:

```text
Admin

Manager

Cashier

Inventory Manager

Accountant
```

Permissions:

```text
Create Sale

Edit Sale

Cancel Sale

Full Refund

Partial Refund

Change Price

Apply Discount

View Reports

View Profit

Adjust Inventory

View Audit Logs
```

Sensitive actions may require:

```text
Manager Approval
```

---

# PART 32 — DATABASE DESIGN PRINCIPLE

Use properly separated tables/entities.

Suggested structure:

```text
users

roles

permissions

customers

products

categories

inventory

inventory_transactions

sales

sale_items

sale_versions

payments

payment_transactions

financial_accounts

financial_ledger

customer_ledger

refunds

refund_items

cash_sessions

cash_transactions

audit_logs
```

Important:

Do not store everything inside one `sales` table.

Normalize the data while maintaining practical performance.

---

# PART 33 — REQUIRED REFERENCES

Every important transaction must be traceable.

Example:

```text
Sale ID:
SALE-1001

Payment ID:
PAY-5001

Inventory Transaction:
INV-8001

Refund ID:
REF-3001

Audit ID:
AUD-9001
```

Relationships must be preserved.

Example:

```text
SALE-1001
│
├── SALE ITEMS
│
├── PAYMENT TRANSACTIONS
│
├── INVENTORY TRANSACTIONS
│
├── EDIT HISTORY
│
├── REFUNDS
│
└── AUDIT LOGS
```

---

# PART 34 — GLOBAL ACCURACY RULE

The following places must always show matching and consistent data:

```text
POS Cart

Sale Preview

Saved Sale

Sale Detail Page

Invoice

Receipt

Print Preview

Payment History

Customer Ledger

Cash Ledger

Card Ledger

Wallet Ledger

Inventory History

Dashboard

Sales Report

Refund Report

Product Report

Financial Report
```

Example:

If sale total is:

```text
500
```

then it must not become:

```text
POS = 500

Receipt = 450 ❌

Report = 550 ❌

Sale Detail = 500
```

There must be one trusted transaction source.

---

# PART 35 — REQUIRED VALIDATION RULES

Validate:

```text
Quantity > 0

Price >= 0

Discount cannot exceed allowed value

Refund Quantity <= Remaining Refundable Quantity

Refund Amount <= Maximum Allowed Refund

Payment Amount cannot be invalid

Stock cannot go negative unless allowed

Completed Sale cannot be refunded twice

Cancelled Sale cannot be cancelled twice

Deleted/cancelled transaction cannot continue affecting reports incorrectly
```

---

# PART 36 — ERROR HANDLING

If an operation fails:

```text
Show clear error message.
```

Example:

```text
Unable to complete refund.

No changes were made.
```

Do not leave:

```text
Inventory Updated

But Refund Failed
```

Everything must rollback.

---

# PART 37 — FINAL QUALITY ASSURANCE REQUIREMENT

Before considering the system complete, test all combinations.

Test:

```text
Cash Sale

Card Sale

Wallet Sale

Bank Sale

Credit Sale

Mixed Payment

Single Product

Multiple Products

Discount

Tax

Partial Payment

Overpayment

Change Return

Edit Quantity Increase

Edit Quantity Decrease

Add Product

Remove Product

Change Product

Change Customer

Change Payment Method

Increase Total

Decrease Total

Full Refund

Partial Refund

Multiple Partial Refunds

Refund After Edit

Edit After Partial Refund

Cancel Sale

Repeated Cancel

Repeated Refund

Double Save

Double Click

Network Retry

Concurrent User Actions
```

---

# FINAL ACCEPTANCE CRITERIA

The system is considered complete only when every action correctly updates all related modules.

For every transaction, verify:

```text
SALE DATA

SALE ITEMS

INVENTORY

INVENTORY TRANSACTIONS

PAYMENTS

FINANCIAL LEDGERS

CUSTOMER LEDGER

CASH / CARD / WALLET / BANK

REFUNDS

REPORTS

DASHBOARD

AUDIT LOGS
```

The system must guarantee:

```text
No duplicate sale

No duplicate payment

No duplicate inventory deduction

No duplicate inventory return

No double refund

No missing refund history

No incorrect customer balance

No incorrect cash balance

No incorrect card balance

No incorrect wallet balance

No mismatch between receipt and sale

No mismatch between sale and reports

No mismatch between inventory and inventory history

No silent data modification

No partial database updates
```

---

# FINAL IMPLEMENTATION INSTRUCTION

Build the entire system as a connected financial and inventory workflow.

Do not implement modules independently without considering their effect on the rest of the system.

Before implementing any feature, analyze:

```text
What data changes?

Which inventory records change?

Which financial records change?

Which customer balance changes?

Which reports are affected?

What happens if the action is repeated?

What happens if the request fails?

What happens if two users perform the action simultaneously?

How can the action be audited?

How can the transaction be reversed safely?
```

Every feature must follow:

```text
VALIDATE
↓
CALCULATE
↓
PREVIEW IF REQUIRED
↓
CONFIRM
↓
DATABASE TRANSACTION
↓
UPDATE RELATED MODULES
↓
CREATE LEDGER RECORDS
↓
CREATE AUDIT LOG
↓
COMMIT
↓
UPDATE UI
↓
VERIFY FINAL RESULT
```

The final system must behave like a **professional POS + inventory + financial transaction system**, where **Sale, Inventory, Payments, Receipts, Refunds, Customer Balances, Reports, and Audit Logs always remain synchronized and mathematically accurate**.
