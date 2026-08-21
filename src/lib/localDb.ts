import { PosDB } from './PosDB';
import { PendingOpEntity, PendingOpType, PendingOp, SyncHistoryItem } from '../types';

export const localDb = new PosDB();
export const SETTINGS_ID = '00000000-0000-4000-8000-000000000001';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function queueOp(
  entity: PendingOpEntity,
  opType: PendingOpType,
  entityId: string,
  payload: any,
  options?: { batchId?: string }
) {
  try {
    const queueCount = await localDb.pendingOps.count();
    if (queueCount >= 1000) {
      const droppable = await localDb.pendingOps
        .where('status')
        .equals('error')
        .limit(queueCount - 800)
        .toArray();
      if (droppable.length > 0) {
        await localDb.pendingOps.bulkDelete(droppable.map(o => o.id).filter(Boolean) as number[]);
        console.warn(`[DB] Queue at cap — pruned ${droppable.length} errored ops to make room.`);
      }
    }

    const existing = await localDb.pendingOps
      .where('[entity+entityId]')
      .equals([entity, entityId])
      .first();

    if (existing && opType !== 'delete') {
      let newOpType: PendingOpType | 'upsert';
      if (existing.opType === 'delete') {
        newOpType = 'delete';
      } else if (existing.opType === 'create' || existing.opType === 'upsert') {
        newOpType = existing.opType;
      } else {
        newOpType = opType;
      }

      const mergedPayload = (existing.opType === 'delete' || newOpType === 'delete')
        ? existing.payload
        : { ...existing.payload, ...payload };

      await localDb.pendingOps.update(existing.id!, {
        payload: mergedPayload,
        opType: newOpType,
        createdAt: Date.now(),
        status: 'pending',
        retries: 0,
        ...(options?.batchId && !existing.batchId ? { batchId: options.batchId } : {})
      });
    } else {
      await localDb.pendingOps.add({
        entity,
        opType,
        entityId,
        payload,
        createdAt: Date.now(),
        retries: 0,
        status: 'pending',
        ...(options?.batchId ? { batchId: options.batchId } : {})
      });
    }

    import('./syncEngine').then(m => m.syncToCloud().catch(() => {}));
    window.dispatchEvent(new Event('pendingops-changed'));
  } catch (err) {
    console.error('[DB] Queue Operation Failed:', err);
  }
}

export async function isPendingDelete(entity: PendingOpEntity, entityId: string): Promise<boolean> {
  const op = await localDb.pendingOps
    .where('[entity+entityId]')
    .equals([entity, entityId])
    .first();
  return op?.opType === 'delete';
}

export async function isPendingChange(entity: PendingOpEntity, entityId: string): Promise<boolean> {
  const op = await localDb.pendingOps
    .where('[entity+entityId]')
    .equals([entity, entityId])
    .first();
  return !!op && op.opType !== 'delete' && op.status !== 'error';
}

export const TABLE_TO_ENTITY: Record<string, PendingOpEntity> = {
  'products': 'products', 'customers': 'customers', 'sales': 'sales', 'discounts': 'discounts',
  'users': 'users', 'categories': 'categories', 'suppliers': 'suppliers', 'productBatches': 'product_batches',
  'purchaseRecords': 'purchase_records', 'purchaseOrders': 'purchase_orders', 'purchaseOrderItems': 'purchase_order_items',
  'supplierTransactions': 'supplier_transactions', 'payments': 'payments', 'stockHistory': 'stock_history',
  'salesTabs': 'sales_tabs', 'expenses': 'expenses', 'appSettings': 'app_settings', 'bundles': 'bundles',
  'bundleItems': 'bundle_items', 'bundleSlots': 'bundle_slots', 'bundleSlotOptions': 'bundle_slot_options',
  'variantStockHistory': 'variant_stock_history', 'productAddons': 'product_addons',
  'payment_movements': 'payment_movements',
  'sale_audit_log': 'sale_audit_log',
};

export async function seedLocalDb(data: any) {
  try {
    const pending = await localDb.pendingOps.toArray();
    const pendingFieldsMap = new Map<string, Record<string, any>>();
    for (const op of pending) {
      if (op.opType === 'delete') continue;
      const key = `${op.entity}:${op.entityId}`;
      const existing = pendingFieldsMap.get(key) || {};
      pendingFieldsMap.set(key, { ...existing, ...op.payload });
    }

    const pendingDeleteIds = new Set(pending.filter(p => p.opType === 'delete').map(p => `${p.entity}:${p.entityId}`));

    const seedTable = async (tableName: keyof typeof localDb, items: any[] | undefined) => {
      if (!items || !Array.isArray(items)) return;
      const entityName = TABLE_TO_ENTITY[tableName as string] || (tableName as PendingOpEntity);
      const nonDeletedItems = items.filter(item => !pendingDeleteIds.has(`${entityName}:${item.id}`));
      const mergedItems = nonDeletedItems.map(item => {
        const key = `${entityName}:${item.id}`;
        const pendingPayload = pendingFieldsMap.get(key);
        if (!pendingPayload) return item;
        return { ...item, ...pendingPayload };
      });
      if (mergedItems.length > 0) {
        const table = localDb[tableName] as any;
        if (typeof table.bulkPut === 'function') {
          await table.bulkPut(mergedItems);
        }
      }
    };

    const tasks = [
      seedTable('products', data.products), seedTable('customers', data.customers),
      seedTable('sales', data.sales), seedTable('discounts', data.discounts),
      seedTable('users', data.users), seedTable('categories', data.categories),
      seedTable('suppliers', data.suppliers), seedTable('salesTabs', data.salesTabs),
      seedTable('expenses', data.expenses), seedTable('supplierTransactions', data.supplierTransactions),
      seedTable('productBatches', data.productBatches), seedTable('purchaseRecords', data.purchaseRecords),
      seedTable('stockHistory', data.stockHistory), seedTable('bundles', data.bundles),
      seedTable('bundleItems', data.bundleItems), seedTable('bundleSlots', data.bundleSlots),
      seedTable('bundleSlotOptions', data.bundleSlotOptions), seedTable('variantStockHistory', data.variantStockHistory),
      seedTable('productAddons', data.productAddons),
    ];
    await Promise.all(tasks);

    if (data.settings) {
      const settingsPending = await localDb.pendingOps.where('[entity+entityId]').equals(['app_settings', SETTINGS_ID]).first();
      if (!settingsPending) {
        await localDb.appSettings.put({ ...data.settings, id: SETTINGS_ID });
      } else {
        const pendingPayload = settingsPending.payload || {};
        await localDb.appSettings.put({ ...data.settings, ...pendingPayload, id: SETTINGS_ID });
      }
    }
    console.log('[DB] ✅ Local seeding complete (field-level merge)');
  } catch (err) {
    console.error('[DB] ❌ Seeding failed:', err);
  }
}

export async function purgeLocalData() {
  const tables = localDb.tables;
  for (const table of tables) {
    if (table.name !== 'appSettings') {
      await table.clear();
    }
  }
  
  // Reset the sync timestamp so the next reload forces a FULL pull from cloud
  localStorage.removeItem('cloud_last_pull_v1');
  
  // Delete indexed db completely as fallback
  await localDb.delete();
  window.location.reload();
}
