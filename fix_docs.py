import os

# Fix Inventory_Stock_Online_Supplier_Master_Guide.md
inv_file = "/Users/shoaib/Desktop/pos v12.2/Inventory_Stock_Online_Supplier_Master_Guide.md"
with open(inv_file, 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if line.startswith("# 6. SALE EDIT INVENTORY LOGIC"):
        start_idx = i
    if line.startswith("# 10. DELETE OR CANCEL BILL"):
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_content = """# 6. SALE EDIT INVENTORY LOGIC (TWO-PHASE ATOMIC PATTERN)

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

"""
    lines[start_idx:end_idx] = [new_content]
    with open(inv_file, 'w') as f:
        f.writelines(lines)
    print("Fixed Inventory Guide")

# Fix POS_Core_System_Master_Guide.md
pos_file = "/Users/shoaib/Desktop/pos v12.2/POS_Core_System_Master_Guide.md"
with open(pos_file, 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if line.startswith("# PART 14 — EDIT SALE"):
        start_idx = i
    if line.startswith("# PART 16 — EDIT CONFIRMATION SCREEN"):
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_content = """# PART 14 — EDIT SALE (TWO-PHASE ATOMIC RULE)

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

"""
    lines[start_idx:end_idx] = [new_content]
    with open(pos_file, 'w') as f:
        f.writelines(lines)
    print("Fixed POS Guide")

