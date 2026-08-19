import os

preamble = """
---

# 🚨 ZAYNAHSPOS STRICT MASTER ARCHITECTURE OVERRIDES 🚨
> **CRITICAL:** The following rules OVERRIDE any generic concepts in this document. This system is heavily offline-first and database-trigger driven. If you violate these rules, the system will break.

1. **NO PRISMA OR DIRECT DB STRINGS:** Prisma ORM, raw Postgres connection strings (`DATABASE_URL`), and direct DB Dashboard connections are **BANNED**. All schema changes MUST go through the Supabase Management API via HTTP/curl and be logged in `SUPER_MASTER_SCHEMA.sql`.
2. **OFFLINE-FIRST QUEUE (localDb):** Never write financial or inventory data directly to Supabase via `supabase-js`. ALL data mutations MUST route through `localDb.ts` (Dexie) and `queueOp()` so they are safely synced by the `SyncEngine` when internet is available.
3. **SINGLE-TENANT ONLY:** This is a 1 Clone = 1 Shop system. `workspace_id` and `shift_id` DO NOT EXIST and must never be used or added.
4. **SHARED MODULES ONLY:** Do not create custom buttons, modals, or drag-and-drop lists. You MUST use the pre-built shared UI (`src/shared/ui/`) and modules (`src/shared/modules/`). Duplicate UI implementations are banned.
5. **ROW TOMBSTONES (DELETES):** Deletions for sales and financial records use hard deletes in the table, but the DB trigger `record_row_tombstone()` catches them to prevent offline-sync resurrections. Never use a `status = 'cancelled'` column for bills.

---
"""

def inject_preamble(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Avoid duplicate injection
    if "ZAYNAHSPOS STRICT MASTER ARCHITECTURE OVERRIDES" in content:
        print(f"Already injected in {filepath}")
        return

    # Find the first occurrence of "---" and insert right before it, 
    # or just insert after the first block of text.
    lines = content.split('\n')
    insert_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("---"):
            insert_idx = i
            break
            
    if insert_idx != -1:
        lines.insert(insert_idx, preamble)
        with open(filepath, 'w') as f:
            f.write('\n'.join(lines))
        print(f"Injected into {filepath}")
    else:
        print(f"Could not find injection point in {filepath}")

inject_preamble("/Users/shoaib/Desktop/pos v12.2/POS_Core_System_Master_Guide.md")
inject_preamble("/Users/shoaib/Desktop/pos v12.2/Inventory_Stock_Online_Supplier_Master_Guide.md")
