import Dexie, { Table } from 'dexie';
import {
  Product, Customer, Sale, Discount, User, AppSettings, SalesTab, Expense, Category, Supplier, StockHistory, Payment, Topping, VariantStockHistory, ProductAddon
} from '../types';
import {
  SCHEMA_V19, SCHEMA_V20, SCHEMA_V21, SCHEMA_V18, SCHEMA_V16, SCHEMA_V15,
  SCHEMA_V14, SCHEMA_V13, SCHEMA_V12, SCHEMA_V11, SCHEMA_V1, SCHEMA_V2, SCHEMA_V4,
  SCHEMA_V5, SCHEMA_V6, SCHEMA_V7, SCHEMA_V8, SCHEMA_V9, SCHEMA_V10,
  migrateV13, migrateV4, migrateV8
} from './posDbHelpers';

// Full CURRENT schema for the opened (top) version. MUST declare EVERY table the
// app uses — Dexie only exposes table handles for tables present in the version
// that is actually opened. The extracted SCHEMA_V22 constant only added
// `customer_ledger` and omitted `paymentModes` / `salesmen`, which broke every
// `localDb.<table>` access at startup. This is the consolidated v19 base + v20
// (payments) + v21 (pendingOps batchId) + v22 (customer_ledger) plus the two
// tables that were dropped during extraction.
const SCHEMA_CURRENT = {
  savedReceiptPngs: 'id, invoiceNumber, saleDate',
  products: 'id, name, barcode, barcodeValue, sku, categoryId, supplierId, isDraft, trackInventory, stock',
  categories: 'id, name',
  suppliers: 'id, name',
  sales: 'id, invoiceNumber, customerId, timestamp, saleDate, status, dcNumber, extraCharges',
  customers: 'id, name, phone, email',
  expenses: 'id, categoryId, date',
  discounts: 'id, name, type, active',
  users: 'id, username, email',
  productBatches: 'id, productId, created_at, status',
  purchaseRecords: 'id, productId, supplierId, date',
  purchaseOrders: 'id, poNumber, supplierId',
  purchaseOrderItems: 'id, poId, productId',
  supplierTransactions: 'id, supplierId',
  payments: 'id, name, isActive',
  paymentModes: 'id, name, isActive',
  stockHistory: 'id, productId, timestamp, type, referenceId',
  salesTabs: 'id, userId',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns, enableSplitPayment',
  pendingOps: '++id, [entity+entityId], status, createdAt, batchId, conflictState',
  syncHistory: '++id, timestamp',
  bundles: 'id, name, active',
  bundleItems: 'id, bundleId, productId',
  bundleSlots: 'id, bundleId',
  bundleSlotOptions: 'id, slotId, productId',
  toppings: 'id, name',
  variantStockHistory: 'id, productId, variantId, createdAt',
  productAddons: 'id, productId, addonProductId, active',
  app_settings: 'id, storeName, currency, enableSplitPayment, enableExtraCharges',
  purchase_records: 'id, productId, supplierId, date',
  salesmen: 'id, name, active',
  customer_ledger: 'id, customerId, saleId, type, createdAt',
  payment_movements: 'id, modeId, referenceId, createdAt',
  sale_audit_log: 'id, saleId, action, createdAt',
};

export class PosDB extends Dexie {
  products!: Table<Product>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;
  discounts!: Table<Discount>;
  users!: Table<User>;
  categories!: Table<Category>;
  suppliers!: Table<Supplier>;
  productBatches!: Table<any>;
  purchaseRecords!: Table<any>;
  purchaseOrders!: Table<any>;
  purchaseOrderItems!: Table<any>;
  supplierTransactions!: Table<any>;
  payments!: Table<any>;
  paymentModes!: Table<any>;
  stockHistory!: Table<any>;
  salesTabs!: Table<SalesTab>;
  expenses!: Table<Expense>;
  appSettings!: Table<any>;
  pendingOps!: Table<any>;
  syncHistory!: Table<any>;
  bundles!: Table<any>;
  bundleItems!: Table<any>;
  bundleSlots!: Table<any>;
  bundleSlotOptions!: Table<any>;
  toppings!: Table<Topping>;
  variantStockHistory!: Table<VariantStockHistory>;
  productAddons!: Table<ProductAddon>;
  savedReceiptPngs!: Table<any>;
  salesmen!: Table<any>;
  payment_movements!: Table<any>;
  sale_audit_log!: Table<any>;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
    const dbName = `ZaynahsPosDB_${projectRef}`;

    super(dbName);

    this.on('versionchange', () => {
      this.close();
      console.warn('Database version changed. Closing connection to allow upgrade.');
    });

    // Versions MUST be declared in strictly ascending, unique order or Dexie
    // throws at construction (which previously made every table handle undefined).
    this.version(1).stores(SCHEMA_V1);
    this.version(2).stores(SCHEMA_V2);
    this.version(4).stores(SCHEMA_V4).upgrade(migrateV4);
    this.version(5).stores(SCHEMA_V5);
    this.version(6).stores(SCHEMA_V6);
    this.version(7).stores(SCHEMA_V7);
    this.version(8).stores(SCHEMA_V8).upgrade(migrateV8);
    this.version(9).stores(SCHEMA_V9);
    this.version(10).stores(SCHEMA_V10);
    this.version(11).stores(SCHEMA_V11);
    this.version(12).stores(SCHEMA_V12);
    this.version(13).stores(SCHEMA_V13).upgrade(migrateV13);
    this.version(14).stores(SCHEMA_V14);
    this.version(15).stores(SCHEMA_V15);
    this.version(16).stores(SCHEMA_V16);
    this.version(18).stores(SCHEMA_V18);
    this.version(19).stores(SCHEMA_V19);
    this.version(20).stores(SCHEMA_V20);
    this.version(21).stores(SCHEMA_V21);
    this.version(22).stores(SCHEMA_CURRENT);
    this.version(23).stores(SCHEMA_CURRENT);
    this.version(24).stores(SCHEMA_CURRENT);
    this.version(25).stores(SCHEMA_CURRENT);
    this.version(26).stores(SCHEMA_CURRENT);
    this.version(27).stores(SCHEMA_CURRENT);
    this.version(28).stores(SCHEMA_CURRENT);
    this.version(29).stores(SCHEMA_CURRENT);
  }
}
