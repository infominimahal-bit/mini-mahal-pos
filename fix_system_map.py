import re

file_path = "/Users/shoaib/Desktop/pos v12.2/SYSTEM_MAP.md"
with open(file_path, 'r') as f:
    content = f.read()

# Remove the line with /purchase-orders from the tables
content = re.sub(r"\| `/purchase-orders` \| Purchase Orders \(Restock\) \| `PurchaseOrderSystem` \| All \| \(see Inventory/Restock \+ orphaned purchase_orders\) \|\n", "", content)
content = re.sub(r"\| `/purchase-orders` \| PurchaseOrderSystem \| Yes \| `:384` \|\n", "", content)

# Remove section 2.8 Purchase Orders entirely since it is covered in Inventory RESTOCK
content = re.sub(r"### 2\.8 — PURCHASE ORDERS \(`/purchase-orders`\).*?(?=### 2\.9|##)", "", content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)
print("Updated SYSTEM_MAP.md")
