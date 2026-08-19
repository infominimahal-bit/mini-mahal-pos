import re

gemini_file = "/Users/shoaib/Desktop/pos v12.2/GEMINI.md"
with open(gemini_file, "r") as f:
    gemini = f.read()

# Remove F3
gemini = re.sub(r"## RULE F3 — DUAL BATCH SYNC \(MOST COMMON BUG\).*?(?=## RULE F4 —)", "", gemini, flags=re.DOTALL)

# Remove F9
gemini = re.sub(r"## RULE F9 — PURCHASE RECORD DELETION MUST RESTORE BATCHES \+ LOG HISTORY \(PERMANENT\).*?(?=## RULE F10 —)", "", gemini, flags=re.DOTALL)

# Modify F8
f8_pattern = r"corrupt:.*?; clean: number; \}>\s*=>\s*\{\s*const \{ data \} = await supabase.rpc\('audit_stock_integrity'\);\s*// RPC returns products where stock != sum of batch qty_remaining"
f8_replacement = "corrupt: Array<{ name: string; stock: number; diff: number }>;\n  clean: number;\n}> => {\n  const { data } = await supabase.rpc('audit_stock_integrity');\n  // RPC returns products with stock history mismatches"
gemini = re.sub(f8_pattern, f8_replacement, gemini, flags=re.DOTALL)

# Modify F11
f11_pattern = r"Scans all tracked products, compares `products.stock` vs `SUM\(product_batches.qty_remaining\)`, reports mismatches"
f11_replacement = "Scans all tracked products, compares `products.stock` vs `stock_history` ledger total, reports mismatches"
gemini = re.sub(f11_pattern, f11_replacement, gemini, flags=re.DOTALL)
gemini = gemini.replace("fixing stock/batch drift", "fixing stock ledger drift")

# Remove batch from F24/E-store
gemini = gemini.replace(" / variant stock / batches)", " / variant stock)")

# Remove Batch mismatch SQL from bottom
gemini = re.sub(r"\*\*2\. Stock vs batch mismatch:\*\*.*?(?=\*\*3\.|\n\n\n|$)", "", gemini, flags=re.DOTALL)

with open(gemini_file, "w") as f:
    f.write(gemini)
print("Updated GEMINI.md")

# POS Guide
pos_file = "/Users/shoaib/Desktop/pos v12.2/POS_Core_System_Master_Guide.md"
with open(pos_file, "r") as f:
    pos_content = f.read()

pos_addition_20 = """\n\n**(ZaynahsPOS Specific Rule: Cancellations/Voids must be handled via hard deletes using `row_tombstones` for offline audit safety. Do not use a 'CANCELLED' status for sales.)**\n\n**Note on Drafts:**\nUnpaid/draft sales are merely saved carts (`status: 'pending'`). They never touch inventory and are excluded from financial reports. They do not need refunds or cancellations."""
pos_content = pos_content.replace("Cancellation must not be allowed twice.", "Cancellation must not be allowed twice." + pos_addition_20)

pos_addition_28 = """\n\n**(ZaynahsPOS Specific Rule: All transactions must first be written to the localDb (Dexie) queue. Queue merge rules must be respected to ensure offline-first safety.)**"""
pos_content = pos_content.replace("Atomic Transactions\n```", "Atomic Transactions\n```" + pos_addition_28)

with open(pos_file, "w") as f:
    f.write(pos_content)
print("Updated POS Guide")


# Inventory Guide
inv_file = "/Users/shoaib/Desktop/pos v12.2/Inventory_Stock_Online_Supplier_Master_Guide.md"
with open(inv_file, "r") as f:
    inv_content = f.read()

inv_addition_10 = """\n\n**(ZaynahsPOS Specific Rule: Cancellations/Voids must be handled via hard deletes using `row_tombstones` for offline audit safety. Do not use a 'CANCELLED' status for sales in the DB.)**"""
inv_content = inv_content.replace("Never permanently delete completed financial transactions.", "Never permanently delete completed financial transactions." + inv_addition_10)

inv_addition_17 = """\n\n**Note on Drafts:**\nDrafts (`status: 'pending'`) are merely saved carts. They never touch stock, so they do not need stock restoration logic upon cancellation."""
inv_content = inv_content.replace("unless business settings explicitly require it.", "unless business settings explicitly require it." + inv_addition_17)

inv_addition_49 = """\n\n**(ZaynahsPOS Specific Rule: All sensitive actions must route through localDb (Dexie) queue. Ensure queue sync rules are followed so operations are not lost or duplicated during offline sync.)**"""
inv_content = inv_content.replace("Status Validation\n```", "Status Validation\n```" + inv_addition_49)

with open(inv_file, "w") as f:
    f.write(inv_content)
print("Updated Inventory Guide")

