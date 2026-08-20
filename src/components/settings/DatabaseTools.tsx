import React, { useState } from 'react';
import { Database, ShieldAlert, CheckCircle2, RefreshCw, History, Package, Users, ShoppingCart, Receipt, Tag, Settings, Layers, Truck, ClipboardList, CheckSquare, Square } from 'lucide-react';
import { purgeLocalData } from '../../lib/localDb';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { sonner } from '../../lib/sonner';
import { Button } from '../../shared/ui';
import { DataExportTools } from './DataExportTools';

const STORE_OPTIONS = [
  { key: 'products', label: 'Products', icon: Package, color: 'text-primary' },
  { key: 'customers', label: 'Customers', icon: Users, color: 'text-blue-500' },
  { key: 'sales', label: 'Sales', icon: ShoppingCart, color: 'text-primary' },
  { key: 'expenses', label: 'Expenses', icon: Receipt, color: 'text-red-500' },
  { key: 'discounts', label: 'Discounts', icon: Tag, color: 'text-orange-500' },
  { key: 'users', label: 'Users', icon: Users, color: 'text-violet-500' },
  { key: 'salesTabs', label: 'Sales Tabs', icon: Layers, color: 'text-cyan-500' },
  { key: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600' },
  { key: 'categories', label: 'Categories', icon: Tag, color: 'text-primary' },
  { key: 'suppliers', label: 'Suppliers', icon: Truck, color: 'text-orange-500' },
  { key: 'productBatches', label: 'Product Batches', icon: ClipboardList, color: 'text-pink-500' },
  { key: 'purchaseRecords', label: 'Purchase Records', icon: ClipboardList, color: 'text-lime-600' },
  { key: 'purchase_orders', label: 'Purchase Orders', icon: ClipboardList, color: 'text-orange-600', dbKey: 'purchaseOrders' },
  { key: 'purchase_order_items', label: 'PO Items', icon: Package, color: 'text-orange-400', dbKey: 'purchaseOrderItems' },
  { key: 'supplier_transactions', label: 'Supplier Txns', icon: Database, color: 'text-red-600', dbKey: 'supplierTransactions' },
  { key: 'payments', label: 'Payments', icon: CheckCircle2, color: 'text-primary' },
  { key: 'stock_history', label: 'Stock History', icon: History, color: 'text-gray-600', dbKey: 'stockHistory' },
  { key: 'variant_stock_history', label: 'Variant Stock History', icon: History, color: 'text-gray-500', dbKey: 'variantStockHistory' },
  { key: 'bundles', label: 'Bundles & Deals', icon: Tag, color: 'text-purple-500' },
  { key: 'bundle_items', label: 'Bundle Items', icon: Package, color: 'text-purple-400', dbKey: 'bundleItems' },
  { key: 'bundle_slots', label: 'Bundle Slots', icon: Layers, color: 'text-purple-300', dbKey: 'bundleSlots' },
  { key: 'bundle_slot_options', label: 'Slot Options', icon: CheckCircle2, color: 'text-purple-200', dbKey: 'bundleSlotOptions' },
  { key: 'toppings', label: 'Toppings', icon: Layers, color: 'text-amber-400' },
  { key: 'productAddons', label: 'Product Addons', icon: Package, color: 'text-teal-500' },
];

export function DatabaseTools() {
  const { profile } = useAuth();
  const canExportDb = can(profile?.role, 'export_database');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set(STORE_OPTIONS.map(s => s.key)));
  const allSelected = selectedStores.size === STORE_OPTIONS.length;

  const toggleStore = (key: string) => {
    setSelectedStores(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(STORE_OPTIONS.map(s => s.key)));
    }
  };

  const handlePurgeAll = async () => {
    const result = await sonner.confirm(
      'System Reset?',
      'This will wipe ALL local data for this workspace and force a fresh synchronization. Are you sure?'
    );
    if (result.isConfirmed) {
      sonner.loading('Purging...');
      await purgeLocalData();
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-50 dark:border-white/5">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Database className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Database Management</h2>
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Backup &amp; Restore with Table Selection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-black/20 p-5 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-2">
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Select Tables</h3>
              <Button
                type="button"
                onClick={toggleAll}
                className="!min-h-0 !p-0 !gap-1 !text-[9px] !text-primary dark:!text-emerald-400 hover:!underline !hover:bg-transparent"
              >
                {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STORE_OPTIONS.map(store => {
                const Icon = store.icon;
                const isSelected = selectedStores.has(store.key);
                return (
                   <Button
                    type="button"
                    key={store.key}
                    variant="ghost"
                    onClick={() => toggleStore(store.key)}
                    className={`!min-h-0 !justify-start !normal-case !tracking-normal !p-2 !text-left !text-[11px] !font-bold !shadow-none !border ${isSelected
                      ? '!bg-emerald-50 dark:!bg-primary/10 !border-emerald-200 dark:!border-primary/30 !text-emerald-700 dark:!text-emerald-400 !ring-1 !ring-emerald-500/10'
                      : '!bg-gray-50 dark:!bg-white/[0.02] !border-gray-200 dark:!border-white/5 !text-gray-500 hover:!bg-gray-100 dark:hover:!bg-white/5'
                      }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? store.color : 'text-gray-600 dark:text-gray-500'}`} />
                    <span className="truncate">{store.label}</span>
                    {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto text-primary shrink-0" />}
                  </Button>
                );
              })}
            </div>
            <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
              {selectedStores.size} of {STORE_OPTIONS.length} tables selected
            </div>
          </div>

          <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-950/20 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-primary dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-tight">Auto Maintenance</h3>
                <p className="text-emerald-800/60 dark:text-emerald-400/50 text-[9px] mt-1 font-bold leading-relaxed uppercase tracking-wider">
                  Barcode seeding &amp; stock accuracy now run automatically after each sync. Stock stays accurate and all items keep valid barcodes with no manual steps.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <DataExportTools selectedStores={selectedStores} canExportDb={canExportDb} />

          <div className="bg-red-50/40 dark:bg-red-950/10 p-5 rounded-[2rem] border border-red-100 dark:border-red-950/20 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h3 className="text-xs font-black text-red-950 dark:text-red-400 uppercase tracking-tight">System Reset</h3>
                <p className="text-red-800/60 dark:text-red-400/50 text-[9px] mt-1 font-bold leading-relaxed uppercase tracking-wider">
                  Wipes local database and triggers a fresh sync from cloud.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="danger"
              onClick={() => canExportDb && handlePurgeAll()}
              disabled={!canExportDb}
              className="w-full !py-2.5 !rounded-xl !text-[9px] !font-black !gap-1.5 !bg-red-600 hover:!bg-red-700 !shadow-md !hover:opacity-100 disabled:!opacity-40"
            >
              Purge Local Database
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
