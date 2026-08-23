// Non-schema helpers for PosDB: upgrade (migration) callbacks.
// Version-index definitions live in ./posDbSchema.

export * from './posDbSchema';

export const migrateV13 = async (trans: any) => {
  try {
    const legacySettings = await trans.table('app_settings').toArray();
    if (legacySettings.length > 0) {
      const currentSettings = await trans.table('appSettings').toArray();
      if (currentSettings.length === 0) {
        await trans.table('appSettings').bulkPut(legacySettings);
      }
      await trans.table('app_settings').clear();
    }
  } catch (_err) {}

  try {
    const legacyPurchases = await trans.table('purchase_records').toArray();
    if (legacyPurchases.length > 0) {
      const currentPurchases = await trans.table('purchaseRecords').toArray();
      if (currentPurchases.length === 0) {
        await trans.table('purchaseRecords').bulkPut(legacyPurchases);
      }
      await trans.table('purchase_records').clear();
    }
  } catch (_err) {}
};

export const migrateV4 = async (trans: any) => {
  await trans.table('products').clear();
  await trans.table('customers').clear();
  await trans.table('sales').clear();
  await trans.table('appSettings').clear();
};

export const migrateV8 = async (trans: any) => {
  await trans.table('salesTabs').clear();
};
