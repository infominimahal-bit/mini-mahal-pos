# ROLE

Act as a **Senior Inventory System Architect, POS Architect, E-Commerce Architect, Financial Ledger Expert, Database Architect, Backend Engineer, QA Engineer, and System Auditor**.

Analyze, redesign, and implement a **production-level Inventory Management System** connected with:

* POS Sales
* Online Store Orders
* Returns
* Refunds
* Partial Refunds
* Bill Editing
* Bill Cancellation
* Restocking
* Inventory Adjustments
* Barcode System
* Suppliers
* Purchases
* Expenses
* Cash
* Wallets
* Cards
* Bank Accounts
* Customer Accounts
* Manual Money In/Out
* Users and Permissions
* System Settings
* Reports

The highest priority is:

> **Inventory must never increase or decrease incorrectly. Every stock movement must have a reason, reference, user, date, and transaction record.**

The current system has inventory accuracy issues. Stock may increase, decrease, duplicate, or become out of sync after different actions.

This new implementation must solve all inventory consistency problems permanently.


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

# 1. THE GOLDEN INVENTORY RULE

Never directly change product stock without creating an inventory transaction.

Every stock movement must create a permanent ledger record.

Stock can only change through approved actions:

```text
initial
stock_in
sale
return
adjustment
adjustment_out
```

Every inventory transaction must contain:

```text
Transaction ID

Product ID

Product Name

Variant ID if applicable

Transaction Type

Quantity Before

Quantity Change

Quantity After

Reference Type

Reference ID

Source Module

User ID

Date and Time

Reason

Notes

Created By

Idempotency Key
```

Example:

```text
Product: Coca Cola

Previous Stock: 100

Transaction Type: POS_SALE

Quantity Change: -2

New Stock: 98

Reference: SALE-1001

User: Cashier-1

Date: 2026-08-18
```

The system must never silently update:

```text
stock = stock - quantity
```

without a transaction history.

---

# 2. INVENTORY MUST HAVE ONE SOURCE OF TRUTH

The system must not maintain multiple conflicting stock values.

There must be one authoritative inventory source.

The following pages must display synchronized inventory:

```text
Inventory Page

Product Detail

POS

Online Store

Online Product Page

Cart Availability

Checkout Availability

Sales Detail

Purchase / Restock Page

Reports
```

All pages must read from the same inventory system or a properly synchronized inventory service.

Never allow:

```text
Inventory Page = 10

POS = 8

Online Store = 12
```

unless there is an intentional concept such as:

```text
Physical Stock
Reserved Stock
Available Stock
```

In that case:

```text
Available Stock = Physical Stock (No reservations allowed in ZaynahsPOS)
```

This logic must be clearly defined everywhere.

---

# 3. INVENTORY QUANTITY MODEL

The system should maintain:

```text
Physical Stock

Reserved Stock

Available Stock

Damaged Stock

Incoming Stock if applicable
```

Formula:

```text
Available Stock = Physical Stock (No reservations allowed in ZaynahsPOS)
```

Example:

```text
Physical Stock = 100

Stock is deducted ONLY upon final POS conversion.
```

Never allow fake, expired, cancelled, or unpaid orders to permanently reduce physical stock unless the configured reservation system requires temporary reservation.

---

# 4. POS SALE INVENTORY FLOW

When a cashier creates a POS sale:

```text
Customer
↓
Products Added
↓
Cart
↓
Checkout
↓
Payment Validation
↓
Sale Confirmation
↓
Final Save
```

Only after successful final sale confirmation should inventory permanently decrease.

Correct flow:

```text
1. Validate products

2. Validate stock

3. Calculate totals

4. Validate payment

5. Create Sale

6. Create Sale Items

7. Deduct Inventory

8. Create Inventory Transactions

9. Create Payment Transactions

10. Create Financial Ledger Entries

11. Create Audit Log

12. Commit Database Transaction
```

If any step fails:

```text
ROLLBACK EVERYTHING
```

Never allow:

```text
Sale saved ❌
Inventory deducted ✅
Payment failed ❌
```

or:

```text
Sale failed ❌
Inventory deducted ✅
```

---

# 5. POS CART MUST NOT PERMANENTLY CHANGE STOCK

Adding a product to the POS cart must not permanently deduct inventory.

Example:

```text
Stock = 10

Cashier adds 2 products to cart.
```

Inventory remains:

```text
Physical Stock = 10
```

until the sale is successfully completed.

The cart may optionally use temporary reservation, but:

```text
Temporary Reservation
```

must automatically expire if:

```text
Cart is abandoned

Sale is cancelled

Session expires

Payment fails
```

---

# 6. SALE EDIT INVENTORY LOGIC (TWO-PHASE ATOMIC PATTERN)

When editing a completed sale, the system must NEVER use simple delta logic (difference calculation). Using delta logic breaks tax, discount, and split payment calculations.

The system MUST use the **Two-Phase Atomic Pattern**:

1. **Create New Sale First (Phase 1):** Calculate the entire new cart, deduct the new total inventory, and take the new total payment.
2. **Delete Old Sale Second (Phase 2):** Cancel the old sale, restore its stock entirely, and reverse its original payment.
3. **If Phase 2 fails:** Rollback Phase 1 (delete the new sale) to prevent double deduction.

This guarantees that:
- Taxes are recalculated flawlessly.
- Discounts apply correctly to the new subtotal.
- No partial inventory math errors occur.
- No payment method split logic fails.

---

# 10. DELETE OR CANCEL BILL

A completed bill must not simply disappear from the system.

Instead:

```text
Sale Status = CANCELLED
```

The system must create reversal transactions.

Example:

Original sale:

```text
Product A = -2 stock
```

Cancellation:

```text
Product A = +2 stock
```

Financial transactions must also be reversed according to the cancellation rules.

The original sale must remain in history.

Never permanently delete completed financial transactions.

**(ZaynahsPOS Specific Rule: Cancellations/Voids must be handled via hard deletes using `row_tombstones` for offline audit safety. Do not use a 'CANCELLED' status for sales in the DB.)**

---

# 11. FULL REFUND INVENTORY FLOW

Original sale:

```text
Product A = 2
Product B = 1
```

Full refund:

```text
Product A +2

Product B +1
```

Create:

```text
Refund Record

Refund Items

Inventory Transactions

Financial Refund Transaction

Audit Log
```

Sale status:

```text
REFUNDED
```

The same sale must not be refunded twice.

---

# 12. PARTIAL REFUND INVENTORY FLOW

Original:

```text
Product A

Sold Quantity = 5
```

Customer returns:

```text
Quantity = 2
```

System:

```text
Inventory +2
```

Remaining:

```text
Sold = 5

Refunded = 2

Remaining Refundable = 3
```

Next refund cannot exceed:

```text
3
```

The system must track:

```text
Original Sold Quantity

Refunded Quantity

Remaining Quantity

Total Refund Amount
```

---

# 13. REFUND MUST NOT CREATE DUPLICATE STOCK

If a user clicks refund twice, refreshes the page, or the API retries:

```text
Refund Request #1
```

must only execute once.

Use:

```text
Refund ID

Idempotency Key

Database Transaction

Row Locking

Unique Constraints
```

Second request:

```text
Return existing refund result.

Do not add stock again.
Do not return money again.
```

---

# 14. ONLINE STORE INVENTORY FLOW

The online store must use the same product and inventory system as the POS.

However, an online order must NOT automatically become a final POS sale immediately.

Correct flow:

```text
ONLINE CUSTOMER
↓
Places Order
↓
ORDER CREATED
↓
ORDER VALIDATED
↓
Payment / Order Status Checked
↓
Store/Admin Processes Order
↓
Order Approved / Fulfilled
↓
POS / SALES BILL CREATED
↓
Final Inventory Deduction
↓
Final Sales Record
↓
Financial Record
```

Important rule:

> **An online order must not permanently reduce final inventory or increase final sales reports until it reaches the configured confirmed/processed stage.**

This prevents:

```text
Fake Orders

Spam Orders

Unpaid Orders

Abandoned Orders

Duplicate Orders

Cancelled Orders
```

from corrupting:

```text
Inventory

Sales

Revenue

Reports
```

---

# 15. ONLINE ORDER RESERVATION SYSTEM

The system may reserve stock temporarily for valid online orders.

Example:

```text
Physical Stock = 10

Valid Pending Order = 2
```

Then:

```text
Stock is deducted ONLY upon final POS conversion.
```

But:

```text
Physical Stock remains 10
```

If order is:

```text
Cancelled

Payment Failed

Expired

Rejected
```

then:

```text
Reserved Stock = -2
```

and stock becomes available again.

No permanent inventory transaction should be created until the configured order confirmation or fulfillment stage.

---

# 16. ONLINE ORDER TO POS BILL FLOW

When an online order is approved for fulfillment:

```text
Online Order
↓
Create / Open POS Sale
↓
Review Order
↓
Confirm Products
↓
Confirm Final Amount
↓
Confirm Payment Status
↓
Generate Sale Bill
↓
Deduct Final Inventory
↓
Create Financial Transactions
```

The same online order must not generate two POS bills.

Use:

```text
Online Order ID

POS Sale ID

Unique Conversion Reference
```

Example:

```text
ONLINE-1001
→
SALE-5001
```

One completed order should have controlled linkage.

---

# 17. ONLINE ORDER STATUS FLOW

Use proper states:

```text
Three separate fields must be used: orderStatus, paymentStatus, and fulfillmentStatus. Never collapsed into a single status.
```

Only approved statuses should move toward final POS conversion.

Do not treat:

```text
PENDING
```

as:

```text
FINAL SALE
```

unless business settings explicitly require it.

**Note on Drafts:**
Drafts (`status: 'pending'`) are merely saved carts. They never touch stock, so they do not need stock restoration logic upon cancellation.

---

# 18. RESTOCK / PURCHASE INVENTORY FLOW

Restocking must increase stock.

Example:

```text
Current Stock = 10

Restock = 20
```

New stock:

```text
30
```

Create inventory transaction:

```text
Type: PURCHASE / RESTOCK

Previous Stock: 10

Change: +20

New Stock: 30

Supplier: XYZ

Reference: PURCHASE-1001
```

The system must record:

```text
Supplier

Purchase Cost

Quantity

Date

Invoice Number

Payment Status

Payment Account

User
```

---

# 19. SUPPLIER ACCOUNT SYSTEM

Suppliers must have their own accounts and ledgers.

Do not mix supplier balances with:

```text
Customer Balances

Cash

Wallet

Sales Revenue
```

Supplier profile:

```text
Supplier ID

Name

Phone

Address

Opening Balance

Current Payable

Purchase History

Payments

Returns
```

Supplier ledger:

```text
PURCHASE

SUPPLIER_PAYMENT

PURCHASE_RETURN

MANUAL_ADJUSTMENT
```

Example:

```text
Purchase from Supplier = 10,000

Amount Paid = 4,000

Supplier Payable = 6,000
```

Supplier ledger must show complete history.

---

# 20. SUPPLIER PAYMENT FLOW

When paying a supplier:

```text
Select Supplier
↓
Select Amount
↓
Select Payment Source
↓
Cash / Wallet / Bank / Card
↓
Confirm
```

Example:

```text
Supplier Payment = 5,000

Paid From = Bank
```

Effects:

```text
Supplier Payable = -5,000

Bank Account = -5,000
```

Create:

```text
Supplier Ledger Entry

Financial Ledger Entry

Audit Log
```

---

# 21. MANUAL MONEY IN / MONEY OUT

The system must support manual transactions.

Examples:

```text
Cash Added

Cash Removed

Wallet Top-up

Wallet Withdrawal

Bank Deposit

Bank Withdrawal

Manual Income

Manual Expense

Owner Withdrawal

Owner Investment
```

Every transaction must require:

```text
Amount

Account

Type

Reason

Date

User

Reference / Notes
```

Example:

```text
Cash Account

Manual Cash Out

Amount: 1,000

Reason: Office Expense
```

Result:

```text
Cash Ledger -1,000

Expense Record +1,000
```

---

# 22. WALLET SYSTEM

Wallets must have independent ledgers.

Support:

```text
Wallet Payment

Wallet Refund

Wallet Top-up

Wallet Withdrawal

Manual Adjustment
```

Example:

```text
Wallet Balance = 10,000

Customer Sale Paid by Wallet = 500

Business Wallet Effect = +500
```

Refund:

```text
Wallet -500
```

Never directly modify wallet balance without a ledger record.

---

# 23. CASH SYSTEM

Cash must maintain:

```text
Opening Balance

POS Cash Sales

Cash Refunds

Expenses

Manual Cash In

Manual Cash Out

Supplier Payments

Bank Deposits

Closing Balance
```

Formula:

```text
Opening Cash

+ Cash In

- Cash Out

= Closing Cash
```

Every movement must be visible.

---

# 24. CARD SYSTEM

Card transactions must be separate from cash.

Track:

```text
Card Sale

Card Refund

Card Fees if applicable

Card Settlement

Manual Adjustment
```

Example:

```text
Card Sale = +1,000

Card Refund = -200

Net Card Collection = 800
```

---

# 25. BANK ACCOUNT SYSTEM

Support multiple bank accounts.

Example:

```text
Bank Account A

Bank Account B
```

Transactions:

```text
Sale Payment

Supplier Payment

Expense

Deposit

Withdrawal

Transfer

Refund

Manual Adjustment
```

Transfers between accounts must create two linked entries.

Example:

```text
Bank A -10,000

Bank B +10,000
```

Both records must share the same transfer reference.

---

# 26. EXPENSE SYSTEM

Expenses must be separate from sales.

Expense categories:

```text
Rent

Electricity

Salary

Transport

Office

Maintenance

Marketing

Other
```

Each expense:

```text
Expense ID

Date

Category

Amount

Paid From

Reference

Description

User
```

Example:

```text
Expense = 5,000

Paid From = Cash
```

Effects:

```text
Expense Ledger +5,000

Cash Ledger -5,000
```

---

# 27. SALE DATE AND ACCOUNTING DATE

The system must clearly handle dates.

Every transaction should contain:

```text
Transaction Date

Created Date

Updated Date

Business Date

Accounting Date if required
```

Do not silently change original sale date when editing a sale.

Example:

```text
Original Sale:
10 August

Edited:
18 August
```

Keep:

```text
Original Sale Date = 10 August

Edit Date = 18 August
```

Reports must have clearly defined date filtering.

---

# 28. MANUAL DATE CONTROL

If users can manually select dates, control permissions.

Example:

```text
Cashier:
Cannot backdate without permission

Manager:
Can edit date

Admin:
Full control
```

Every backdated transaction must create an audit log.

---

# 29. INVENTORY ADJUSTMENT

Manual stock adjustment must require a reason.

Example:

```text
Current Stock = 100

Physical Count = 95
```

Adjustment:

```text
-5
```

Reason:

```text
Damaged / Lost / Counting Difference
```

Create:

```text
Inventory Adjustment Transaction

Previous Stock

Change

New Stock

Reason

User

Date
```

Never allow stock adjustment without traceability.

---

# 30. STOCKTAKE / PHYSICAL INVENTORY COUNT

Provide a stock counting system.

Flow:

```text
Start Stocktake
↓
Freeze or snapshot expected stock
↓
Enter Physical Count
↓
Calculate Difference
↓
Manager Review
↓
Approve Adjustment
↓
Create Inventory Adjustment
```

Example:

```text
System Stock = 100

Physical Stock = 97

Difference = -3
```

After approval:

```text
Adjustment = -3
```

Do not silently overwrite:

```text
100 → 97
```

---

# 31. BARCODE SYSTEM

Create a complete barcode system.

Each product may have:

```text
SKU

Barcode

Internal Product Code

Variant Barcode
```

POS must support:

```text
Barcode Scanner Input
```

Flow:

```text
Scan Barcode
↓
Find Product
↓
Validate Product
↓
Check Availability
↓
Add to Cart
```

If barcode does not exist:

```text
Show Product Not Found
```

Do not create duplicate products automatically.

Barcode settings:

```text
Enable / Disable Barcode

Barcode Format

Auto Generate Barcode

Manual Barcode

Duplicate Barcode Prevention
```

Every barcode must be unique where required.

---

# 32. PRODUCT SETTINGS

Product settings should include:

```text
Product Name

SKU

Barcode

Category

Supplier

Cost Price

Selling Price

Minimum Stock

Maximum Stock if required

Track Inventory

Allow Negative Stock

Active / Inactive

Online Visibility

POS Visibility

Variants
```

POS and online store visibility must be separate.

Example:

```text
Available in POS = Yes

Available Online = No
```

or:

```text
POS = No

Online = Yes
```

---

# 33. ONLINE STORE PRODUCT RELATION

Online store products must connect to the same master product records.

Avoid creating separate uncontrolled stock.

Recommended structure:

```text
MASTER PRODUCT
│
├── POS Availability
│
├── Online Availability
│
├── Shared Inventory
│
├── Online Price
│
└── POS Price
```

Prices may differ, but inventory reference must remain controlled.

If one item is sold in POS:

```text
Shared Stock decreases.
```

The online store availability must update accordingly.

If an approved online order is converted to a final sale:

```text
Shared Stock decreases once.
```

Never twice.

---

# 34. ONLINE STORE SETTINGS

Create a dedicated Online Store Settings section.

Tabs:

```text
General

Store Information

Online Products

Inventory Rules

Order Settings

Payment Settings

Delivery Settings

Cancellation Rules

Return Rules

Refund Rules

Order Confirmation Rules

Stock Reservation Rules

Notifications

Customer Settings
```

Important inventory setting:

```text
When should stock be permanently deducted?
```

Options may include:

```text
Order Confirmed

Payment Confirmed

Order Fulfilled

Converted to POS Sale
```

Recommended configuration for this system:

> **Permanent inventory deduction happens only when the approved online order is converted into a final POS/Sale bill.**

Before that:

```text
Only temporary reservation may be used.
```

This prevents fake orders from damaging inventory and sales reports.

---

# 35. ONLINE ORDER PAYMENT FLOW

Online orders may have:

```text
Cash on Delivery

Online Payment

Bank Transfer

Wallet

Manual Payment
```

Payment status:

```text
UNPAID

PENDING

PAID

FAILED

REFUNDED
```

An order can exist without becoming a final sale.

Example:

```text
Fake COD Order
```

must not:

```text
Increase Sales Revenue ❌

Permanently Reduce Inventory ❌

Appear as Completed Sale ❌
```

until approved according to system rules.

---

# 36. POS CHECKOUT — DEEP VALIDATION

The POS checkout must validate all details before final save.

Check:

```text
Cart not empty

Product active

Correct quantity

Available inventory

Correct price

Correct discount

Correct tax

Customer if required

Payment method

Payment amount

Mixed payment total

Due amount

Change amount

Cashier permissions
```

Before final save show:

```text
SALE SUMMARY
```

Including:

```text
Items

Quantity

Subtotal

Discount

Tax

Grand Total

Payment Breakdown

Paid

Due

Change
```

Only after confirmation:

```text
FINALIZE SALE
```

---

# 37. PAYMENT EFFECTS ON ALL ACTIONS

Every action must correctly affect the relevant financial account.

Examples:

### Cash Sale

```text
Cash +500
```

### Cash Refund

```text
Cash -500
```

### Wallet Sale

```text
Wallet +500
```

### Wallet Refund

```text
Wallet -500
```

### Supplier Paid from Bank

```text
Bank -500
```

### Expense Paid from Cash

```text
Cash -500
```

### Manual Money Added to Wallet

```text
Wallet +500
```

Every action must have:

```text
Financial Transaction

Reference

Source Action

User

Date

Amount
```

---

# 38. PAYMENT METHOD CHANGE DURING SALE EDIT

Original:

```text
Sale Total = 500

Cash = 500
```

Edited:

```text
New Total = 400

Card = 400
```

The system must clearly process:

```text
Reverse / Adjust Original Cash Position

Create New Card Payment

Calculate Difference

Process Refund or Customer Credit
```

Never leave:

```text
Cash +500

AND

Card +400
```

for a final sale of only 400.

The entire payment adjustment must be recorded.

---

# 39. USERS AND PERMISSIONS

Create role-based permissions.

Roles:

```text
Admin

Manager

Sales Manager

Cashier

Inventory Manager

Accountant

Online Store Manager

Warehouse Staff
```

Permissions must be granular.

Examples:

```text
Create Sale

Edit Sale

Edit Old Sale

Cancel Sale

Delete Draft Sale

Full Refund

Partial Refund

Change Payment Method

Change Sale Date

Apply Discount

Change Price

Manual Inventory Adjustment

Restock

Supplier Payment

Manual Cash In

Manual Cash Out

Create Expense

Edit Expense

View Financial Reports

View Profit

Manage Online Orders

Convert Online Order to POS Sale

Change Settings

Manage Users
```

A cashier should not automatically have permission to:

```text
Change old sales

Perform large refunds

Change inventory manually

Modify financial records
```

unless explicitly granted.

---

# 40. SETTINGS PAGE

Create a complete Settings section.

Tabs:

```text
General Settings

Business Information

Currency

Tax Settings

Invoice Settings

Receipt Settings

POS Settings

Inventory Settings

Barcode Settings

Payment Settings

Cash Settings

Wallet Settings

Bank Settings

Supplier Settings

Expense Settings

Online Store Settings

Order Settings

Refund Settings

Return Settings

User Roles

Permissions

Audit Settings
```

---

# 41. INVENTORY SETTINGS

Important settings:

```text
Track Inventory

Allow Negative Stock

Low Stock Alert

Stock Reservation Enabled

Reservation Expiry Time

Online Order Stock Rule

POS Stock Deduction Rule

Return Stock Rule

Refund Stock Rule

Cancelled Sale Stock Rule

Backdated Transaction Rule

Manual Adjustment Approval

Stocktake Approval
```

Recommended defaults:

```text
Negative Stock = Disabled

POS Stock Deduction = Final Sale Completion

Online Permanent Deduction = POS Conversion / Final Approval

Fake / Pending Order = No Permanent Stock Deduction

Refund = Restore Stock only once

Sale Cancellation = Controlled reversal

Manual Adjustment = Reason required

Large Adjustment = Manager approval
```

---

# 42. REPORTING SYSTEM

All reports must use the same authoritative transaction data.

Reports must never independently guess or recalculate inventory incorrectly.

Create:

```text
Sales Report

Daily Sales Report

Product Sales Report

Category Sales Report

Cashier Sales Report

Payment Method Report

Online Order Report

POS vs Online Report

Refund Report

Return Report

Inventory Report

Stock Movement Report

Low Stock Report

Out of Stock Report

Stock Adjustment Report

Restock Report

Purchase Report

Supplier Report

Supplier Payable Report

Expense Report

Cash Report

Wallet Report

Card Report

Bank Report

Customer Balance Report

Profit Report

Audit Report
```

---

# 43. INVENTORY REPORT FORMULA

For each product:

```text
Opening Stock

+ Restock / Purchase

+ Customer Returns

+ Refund Stock Return

+ Positive Adjustment

- POS Sales

- Finalized Online Sales

- Damaged

- Loss

- Negative Adjustment

= Closing Stock
```

The report must show every component.

Example:

```text
Opening Stock = 100

Purchase = +50

POS Sale = -20

Online Final Sale = -10

Refund Return = +2

Damaged = -5

Closing Stock = 117
```

Calculation:

```text
100
+ 50
- 20
- 10
+ 2
- 5
=
117
```

---

# 44. SALES REPORT ACCURACY

Do not count:

```text
Pending Online Orders

Fake Orders

Cancelled Orders

Failed Payments
```

as final completed sales.

Separate reporting:

```text
Orders Received

Orders Pending

Orders Confirmed

Orders Cancelled

Orders Converted to Sale

Completed Sales
```

Final Sales Report must only include transactions that qualify as actual sales according to system rules.

---

# 45. DASHBOARD ACCURACY

Dashboard must separately show:

```text
POS Completed Sales

Online Orders

Online Orders Pending

Online Orders Confirmed

Online Orders Converted to Sales

Cancelled Orders

Gross Sales

Refunds

Net Sales
```

Do not merge all online orders into completed sales.

---

# 46. AUDIT LOG

Every sensitive inventory or financial action must be logged.

Actions:

```text
INVENTORY_RESTOCKED

INVENTORY_ADJUSTED

INVENTORY_COUNTED

PRODUCT_DEDUCTED

SALE_CREATED

SALE_EDITED

SALE_CANCELLED

SALE_REFUNDED

PARTIAL_REFUND

ONLINE_ORDER_CREATED

ONLINE_ORDER_CONFIRMED

ONLINE_ORDER_CANCELLED

ONLINE_ORDER_converted

SUPPLIER_PAYMENT

EXPENSE_CREATED

MANUAL_CASH_IN

MANUAL_CASH_OUT

WALLET_ADJUSTMENT

BANK_TRANSFER
```

Every log:

```text
User

Action

Reference

Old Value

New Value

Date

Time

Reason

IP / Device if available
```

---

# 47. DATABASE TRANSACTION REQUIREMENT

Every action affecting inventory and money must use an atomic database transaction.

Example:

```text
BEGIN TRANSACTION

Lock Product Stock

Validate Current Stock

Create Sale

Create Sale Items

Deduct Inventory

Create Inventory Ledger

Create Payment Records

Create Financial Ledger

Create Audit Log

COMMIT
```

If anything fails:

```text
ROLLBACK EVERYTHING
```

Never leave partial changes.

---

# 48. CONCURRENCY PROTECTION

If two users attempt to sell the last product simultaneously:

```text
Available Stock = 1

Cashier A sells 1

Cashier B sells 1
```

Only one should succeed.

Use:

```text
Database Row Locking

Atomic Stock Validation

Optimistic Locking where appropriate

Transaction Isolation
```

Never allow stock:

```text
1

→ -1
```

unless negative stock is explicitly enabled.

---

# 49. DUPLICATE PREVENTION

Protect every sensitive action from:

```text
Double Click

Browser Retry

Network Retry

API Timeout

Page Refresh

Duplicate Webhook

Repeated Online Order Sync

Repeated POS Conversion

Repeated Refund
```

Use:

```text
Idempotency Key

Unique Transaction Reference

Database Unique Constraint

Status Validation
```

**(ZaynahsPOS Specific Rule: All sensitive actions must route through localDb (Dexie) queue. Ensure queue sync rules are followed so operations are not lost or duplicated during offline sync.)**

Example:

```text
Online Order ID:
ONLINE-1001
```

must not create:

```text
SALE-5001

SALE-5002
```

for the same completed order.

---

# 50. SYSTEM-WIDE SYNC RULE

Whenever an action affects inventory, verify its effect across:

```text
Product Detail

Inventory Page

POS

Online Store

Sale Detail

Online Order Detail

Inventory History

Reports

Dashboard
```

Whenever an action affects money, verify:

```text
Sale Detail

Payment History

Cash Ledger

Wallet Ledger

Card Ledger

Bank Ledger

Supplier Ledger

Customer Ledger

Expense Report

Financial Reports

Dashboard
```

All must remain mathematically synchronized.

---

# 51. REQUIRED TESTING

Before implementation is considered complete, test:

```text
Restock

Purchase

POS Sale

POS Sale with Multiple Products

Cash Sale

Card Sale

Wallet Sale

Bank Sale

Mixed Payment

Sale Edit

Increase Quantity

Decrease Quantity

Remove Product

Add Product

Change Product

Change Payment

Full Refund

Partial Refund

Multiple Partial Refunds

Cancel Sale

Duplicate Cancel

Duplicate Refund

Online Fake Order

Online Pending Order

Online Paid Order

Online Cancelled Order

Online Order Conversion to POS

Duplicate Online Conversion

Manual Inventory Adjustment

Stocktake

Damage

Loss

Supplier Purchase

Supplier Payment

Purchase Return

Expense from Cash

Expense from Bank

Wallet Adjustment

Manual Cash In

Manual Cash Out

Barcode Scan

Duplicate Barcode

Two Users Selling Same Product

Last Item Concurrent Sale

Network Retry

Double Click
```

For every test verify:

```text
Stock Before

Stock Change

Stock After

Financial Account Before

Financial Change

Financial Account After

Reference ID

Ledger Entry

Audit Log

Report Effect

Dashboard Effect

Duplicate Protection
```

---

# FINAL ACCEPTANCE CRITERIA

The Inventory System is complete only when the following is guaranteed:

```text
One Source of Truth for Inventory

No Stock Deducted Twice

No Stock Returned Twice

No Duplicate Refund Stock

No Fake Online Order Corrupting Stock

No Pending Online Order Counted as Final Sale

No Duplicate Online Order Conversion

No POS Cart Permanently Deducting Stock

No Sale Edit Deducting Existing Items Again

No Cancelled Sale Continuing to Affect Stock Incorrectly

No Inventory Change Without Ledger

No Financial Change Without Ledger

No Expense Without Account Movement

No Supplier Payment Without Supplier Ledger

No Manual Money Movement Without Reason

No Duplicate Barcode

No Unauthorized Manual Stock Change

No Unauthorized Financial Action

No Mismatch Between POS and Inventory

No Mismatch Between Online Store and Inventory

No Mismatch Between Inventory and Reports
```

---

# FINAL IMPLEMENTATION PRINCIPLE

The complete system must follow this flow for every critical action:

```text
USER ACTION
↓
PERMISSION CHECK
↓
VALIDATION
↓
FETCH CURRENT AUTHORITATIVE DATA
↓
LOCK / PROTECT CONCURRENT DATA
↓
CALCULATE EXACT DELTA
↓
PREVIEW IF REQUIRED
↓
USER CONFIRMATION
↓
DATABASE TRANSACTION
↓
UPDATE INVENTORY
↓
CREATE INVENTORY LEDGER
↓
UPDATE FINANCIAL ACCOUNT IF REQUIRED
↓
CREATE FINANCIAL LEDGER
↓
UPDATE RELATED SALE / ORDER / SUPPLIER / CUSTOMER RECORD
↓
CREATE AUDIT LOG
↓
COMMIT
↓
UPDATE UI
↓
UPDATE REPORTING DATA
```

The system must behave as one connected ecosystem.

The relationship must always remain accurate:

```text
PRODUCT
↓
INVENTORY
↓
POS SALE
↓
PAYMENT
↓
ONLINE ORDER
↓
REFUND / RETURN
↓
SUPPLIER / RESTOCK
↓
EXPENSE / FINANCIAL ACCOUNTS
↓
REPORTS
↓
AUDIT LOG
```

**The final requirement is absolute accuracy: every quantity added or removed must have a reason; every rupee added or removed must have an account and ledger entry; every sale must affect stock only once; every refund must restore stock and money only once; and online orders must not corrupt inventory or sales data before becoming genuine, approved final sales.**
