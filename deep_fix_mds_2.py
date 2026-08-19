import re

# 1. Fix MASTER MD
master_file = "/Users/shoaib/Desktop/pos v12.2/MASTER_AGENT_REPAIR_AND_VERIFY.md"
with open(master_file, 'r') as f:
    master = f.read()

# Delta to Two-Phase
delta_pattern = r"- \*\*Edit Sale Integrity \(Delta Pattern\)\*\*: Editing a completed sale must compute the delta \(`New Qty - Old Qty`\)\. If total increases, require extra payment\. If total decreases, issue a tracked Refund/Credit\. Changes must generate Inventory Adjustments and Audit Logs\."
delta_replacement = "- **Edit Sale Integrity (Two-Phase Pattern)**: Editing a completed sale MUST NOT compute the delta. It must be a two-phase atomic operation: Create the new bill (deducting full new stock and logging new payment), then Delete the old bill (restoring full old stock and reversing old payment). If the delete fails, rollback the new bill creation."
master = master.replace(delta_pattern, delta_replacement)

# Cancel to Tombstone
cancel_pattern = r"- \*\*Cancellation vs Refund\*\*: Use Refund for paid/completed sales\. Use Cancellation \(status change\) for unpaid/draft sales\. Never permanently erase completed transactions\."
cancel_replacement = "- **Cancellation / Voiding**: Cancellations must be handled via hard deletes using `row_tombstones` for offline audit safety. Never use a 'CANCELLED' status change for bills in the DB. Drafts/pending carts are ignored and do not need cancellations."
master = master.replace(cancel_pattern, cancel_replacement)

# Negative Stock Default
neg_pattern = r"- `settings.allowNegativeStock` \(boolean, default = current behavior, i.e. `true` unless confirmed\s+otherwise with the business owner\)\."
neg_replacement = "- `settings.allowNegativeStock` (boolean, default = `false` i.e. NOT ALLOWED)."
master = re.sub(neg_pattern, neg_replacement, master)

# Taxonomy
tax_pattern1 = r"Σ\(PURCHASE_IN, RETURN_IN, ADJUSTMENT_IN, TRANSFER_IN, REVERSAL_IN\)"
tax_repl1 = "Σ(initial, stock_in, return, adjustment)"
master = master.replace(tax_pattern1, tax_repl1)

tax_pattern2 = r"Σ\(SALE_OUT, SUPPLIER_RETURN_OUT, DAMAGE_OUT, LOSS_OUT, TRANSFER_OUT, REVERSAL_OUT\)"
tax_repl2 = "Σ(sale, adjustment_out)"
master = master.replace(tax_pattern2, tax_repl2)

# Atomic DB
atomic_pattern = r"update ledgers → commit all within a single DB transaction"
atomic_repl = "update ledgers → commit all locally via localDb (Dexie.transaction). Cloud sync relies on atomic Supabase RPC."
master = master.replace(atomic_pattern, atomic_repl)

with open(master_file, 'w') as f:
    f.write(master)
print("Updated Master MD")

# 2. Fix Inventory Guide
inv_file = "/Users/shoaib/Desktop/pos v12.2/Inventory_Stock_Online_Supplier_Master_Guide.md"
with open(inv_file, 'r') as f:
    inv = f.read()

# Taxonomy
inv_tax_pattern = r"RESTOCK\s+PURCHASE\s+POS_SALE\s+ONLINE_ORDER_COMPLETED\s+REFUND\s+PARTIAL_REFUND\s+SALE_EDIT\s+SALE_CANCELLED\s+ONLINE_ORDER_CANCELLED\s+MANUAL_ADJUSTMENT\s+STOCK_TRANSFER\s+DAMAGE\s+LOSS\s+EXPIRED\s+STOCKTAKE_CORRECTION\s+RETURN_TO_SUPPLIER"
inv_tax_repl = "initial\nstock_in\nsale\nreturn\nadjustment\nadjustment_out"
inv = re.sub(inv_tax_pattern, inv_tax_repl, inv)

# Reserved Stock concept deletion
inv = re.sub(r"Available Stock\s+=\s+Physical Stock\s+-\s+Reserved Stock", "Available Stock = Physical Stock (No reservations allowed in ZaynahsPOS)", inv)
inv = re.sub(r"Reserved for valid online orders = \d+\s+Available Stock = \d+", "Stock is deducted ONLY upon final POS conversion.", inv)
inv = re.sub(r"Reserved Stock = \d+\s+Available Stock = \d+", "Stock is deducted ONLY upon final POS conversion.", inv)

# Status 1 field vs 3 fields
status_pattern = r"DRAFT\s+PENDING\s+PAYMENT_PENDING\s+PAID\s+CONFIRMED\s+PROCESSING\s+READY_FOR_POS\s+CONVERTED_TO_SALE\s+COMPLETED\s+CANCELLED\s+REJECTED\s+REFUNDED"
status_repl = "Three separate fields must be used: orderStatus, paymentStatus, and fulfillmentStatus. Never collapsed into a single status."
inv = re.sub(status_pattern, status_repl, inv)

inv = inv.replace("CONVERTED_TO_SALE", "converted")
inv = inv.replace("SALE_OUT", "sale")

with open(inv_file, 'w') as f:
    f.write(inv)
print("Updated Inventory Guide")

