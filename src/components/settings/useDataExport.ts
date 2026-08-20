import { useState } from 'react';
import { localDb, queueOp, SETTINGS_ID } from '../../lib/localDb';
import { useSettingsStore, useAppStore } from '../../stores';
import { sonner } from '../../lib/sonner';

interface ImportSummary {
  table: string;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  duplicate: number;
}

const DISPATCH_MAP: Record<string, string> = {
  products: 'SET_PRODUCTS',
  customers: 'SET_CUSTOMERS',
  sales: 'SET_SALES',
  discounts: 'SET_DISCOUNTS',
  users: 'SET_USERS',
  salesTabs: 'SET_SALES_TABS',
  expenses: 'SET_EXPENSES',
  purchaseRecords: 'SET_PURCHASE_RECORDS',
  categories: 'SET_CATEGORIES',
  suppliers: 'SET_SUPPLIERS',
  productBatches: 'SET_PRODUCT_BATCHES',
  supplier_transactions: 'SET_SUPPLIER_TRANSACTIONS',
  payments: 'SET_PAYMENTS',
  purchase_orders: 'SET_PURCHASE_ORDERS',
  purchase_order_items: 'SET_PURCHASE_ORDER_ITEMS',
  stock_history: 'SET_STOCK_HISTORY',
  variant_stock_history: 'SET_VARIANT_STOCK_HISTORY',
  bundles: 'SET_BUNDLES',
  toppings: 'SET_TOPPINGS',
  productAddons: 'SET_PRODUCT_ADDONS',
};

export function useDataExport(selectedStores: Set<string>, canExportDb: boolean) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExport = async () => {
    if (!canExportDb) { sonner.error('You do not have permission to export the database.'); return; }
    if (selectedStores.size === 0) {
      sonner.error('Please select at least one table to export.');
      return;
    }
    setIsExporting(true);
    try {
      sonner.loading('Generating System Backup...');
      const backup: any = {
        version: '2.0',
        platform: 'POS',
        timestamp: new Date().toISOString(),
        selectedTables: Array.from(selectedStores),
        tables: {}
      };

      for (const store of selectedStores) {
        const dbKeyMap: Record<string, string> = {
          settings: 'appSettings',
          purchase_orders: 'purchaseOrders',
          purchase_order_items: 'purchaseOrderItems',
          supplier_transactions: 'supplierTransactions',
          stock_history: 'stockHistory',
          variant_stock_history: 'variantStockHistory',
          bundles: 'bundles',
          bundle_items: 'bundleItems',
          bundle_slots: 'bundleSlots',
          bundle_slot_options: 'bundleSlotOptions',
        };
        const dbKey = dbKeyMap[store] || store;
        const table = (localDb as any)[dbKey];
        if (!table || typeof table.toArray !== 'function') {
          console.warn(`[Export] Skipping unknown store: ${store} (dbKey: ${dbKey})`);
          backup.tables[store] = [];
          continue;
        }
        backup.tables[store] = await table.toArray();
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pos_backup_${new Date().toLocaleDateString('en-CA')}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const tableList = Array.from(selectedStores).map(s => s.toUpperCase()).join(', ');
      sonner.success(`Exported ${selectedStores.size} tables: ${tableList}`);
    } catch (err: any) {
      console.error('Export failed:', err);
      sonner.error(`Backup failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!canExportDb) { sonner.error('You do not have permission to import or restore data.'); return; }
    if (!selectedFile) {
      sonner.error('Please select a backup file first.');
      return;
    }
    if (selectedStores.size === 0) {
      sonner.error('Please select at least one table to import.');
      return;
    }

    const result = await sonner.confirm(
      'Import System Data?',
      `This will merge ${selectedStores.size} selected tables. Duplicates will be skipped.`
    );

    if (!result.isConfirmed) return;

    setIsImporting(true);
    const summaries: ImportSummary[] = [];

    try {
      sonner.loading('📂 Reading backup file...');

      const text = await selectedFile.text();
      let backup: any;
      try {
        backup = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file. Please select a valid POS backup file.');
      }

      if (!backup.tables || typeof backup.tables !== 'object') {
        throw new Error('Invalid backup format. Missing "tables" object.');
      }

      const storeKeys = Array.from(selectedStores);

      for (let i = 0; i < storeKeys.length; i++) {
        const storeKey = storeKeys[i];
        const records = backup.tables[storeKey];

        sonner.update(`⏳ Processing ${storeKey.toUpperCase()} (${i + 1} / ${storeKeys.length})...`);

        if (records === undefined || records === null) {
          summaries.push({ table: storeKey.toUpperCase(), total: 0, imported: 0, skipped: 0, failed: 0, duplicate: 0 });
          continue;
        }

        if (storeKey === 'settings') {
          const settingsData = Array.isArray(records) ? records[0] : records;
          if (!settingsData) {
            summaries.push({ table: 'SETTINGS', total: 0, imported: 0, skipped: 0, failed: 0, duplicate: 0 });
          } else {
            const existing = await localDb.appSettings.get(SETTINGS_ID);
            try {
              const mergedSettings = existing ? { ...existing, ...settingsData, id: SETTINGS_ID } : { ...settingsData, id: SETTINGS_ID };
              await localDb.appSettings.put(mergedSettings);
              try {
                await queueOp('settings', 'upsert', 'singleton', mergedSettings);
              } catch (qErr) {
                console.warn('Could not queue op for settings sync:', qErr);
              }
              useSettingsStore.getState().setSettings({ ...useSettingsStore.getState().settings, ...mergedSettings } as any);
              summaries.push({ table: 'SETTINGS', total: 1, imported: 1, skipped: 0, failed: 0, duplicate: 0 });
            } catch (e) {
              summaries.push({ table: 'SETTINGS', total: 1, imported: 0, skipped: 0, failed: 1, duplicate: 0 });
            }
          }
          continue;
        }

        if (!Array.isArray(records) || records.length === 0) {
          summaries.push({ table: storeKey.toUpperCase(), total: 0, imported: 0, skipped: 0, failed: 0, duplicate: 0 });
          continue;
        }

        let imported = 0, skipped = 0, failed = 0, duplicate = 0;
        const total = records.length;

        const dbKeyMap: Record<string, string> = {
          settings: 'appSettings',
          purchase_orders: 'purchaseOrders',
          purchase_order_items: 'purchaseOrderItems',
          supplier_transactions: 'supplierTransactions',
          stock_history: 'stockHistory',
          variant_stock_history: 'variantStockHistory',
          bundles: 'bundles',
          bundle_items: 'bundleItems',
          bundle_slots: 'bundleSlots',
          bundle_slot_options: 'bundleSlotOptions',
        };
        const dbKey = dbKeyMap[storeKey] || storeKey;
        const table = (localDb as any)[dbKey];

        if (!table || typeof table.put !== 'function') {
          console.warn(`[Import] Skipping unknown store: ${storeKey}`);
          summaries.push({ table: storeKey.toUpperCase(), total, imported: 0, skipped: total, failed: 0, duplicate: 0 });
          continue;
        }

        // Process in smaller batches to avoid freezing UI for large tables
        const BATCH_SIZE = 500;
        for (let j = 0; j < total; j += BATCH_SIZE) {
          const batch = records.slice(j, j + BATCH_SIZE);
          
          sonner.update(`⏳ Saving ${storeKey.toUpperCase()}... (${Math.min(j + BATCH_SIZE, total)} / ${total})`);
          
          await localDb.transaction('rw', table, async () => {
            for (const record of batch) {
              if (!record.id) {
                skipped++;
                continue;
              }
              try {
                const exists = await table.get(record.id);
                if (exists) {
                  duplicate++;
                  continue;
                }
                
                await table.add(record);
                
                try {
                  await queueOp(dbKey, 'insert', record.id, record);
                } catch (qErr) {
                  // just warn if sync queue fails
                }
                
                imported++;
              } catch (e) {
                failed++;
              }
            }
          });
        }

        summaries.push({ table: storeKey.toUpperCase(), total, imported, skipped, failed, duplicate });
      }

      sonner.close();
      useAppStore.getState().setForceRefresh(Date.now());
      sonner.success('Import completed successfully!');
      setTimeout(() => window.location.reload(), 1500);

    } catch (err: any) {
      console.error('Import failed:', err);
      sonner.error(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
      setSelectedFile(null);
    }
  };

  return {
    isExporting,
    isImporting,
    selectedFile,
    setSelectedFile,
    handleExport,
    handleImport
  };
}
