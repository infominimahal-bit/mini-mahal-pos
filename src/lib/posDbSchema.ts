export const SCHEMA_V19 = {
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
  payments: 'id, supplierId',
  stockHistory: 'id, productId, timestamp, type',
  salesTabs: 'id, userId',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns, enableSplitPayment',
  syncHistory: '++id, timestamp',
  bundles: 'id, name, active',
  bundleItems: 'id, bundleId, productId',
  bundleSlots: 'id, bundleId',
  bundleSlotOptions: 'id, slotId, productId',
  toppings: 'id, name',
  variantStockHistory: 'id, productId, variantId, createdAt',
  productAddons: 'id, productId, addonProductId, active',
  app_settings: 'id, storeName, currency, enableSplitPayment, enableExtraCharges',
  purchase_records: 'id, productId, supplierId, date'
};

export const SCHEMA_V20 = {
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
  stockHistory: 'id, productId, timestamp, type',
  salesTabs: 'id, userId',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns, enableSplitPayment',
  syncHistory: '++id, timestamp',
  bundles: 'id, name, active',
  bundleItems: 'id, bundleId, productId',
  bundleSlots: 'id, bundleId',
  bundleSlotOptions: 'id, slotId, productId',
  toppings: 'id, name',
  variantStockHistory: 'id, productId, variantId, createdAt',
  productAddons: 'id, productId, addonProductId, active',
  app_settings: 'id, storeName, currency, enableSplitPayment, enableExtraCharges',
  purchase_records: 'id, productId, supplierId, date'
};

export const SCHEMA_V21 = {
};

export const SCHEMA_V22 = {
  customer_ledger: 'id, customerId, saleId, type, createdAt'
};

// v18 is identical to v19
export const SCHEMA_V18 = SCHEMA_V19;

export const SCHEMA_V16 = {
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
  payments: 'id, supplierId',
  stockHistory: 'id, productId, timestamp, type',
  salesTabs: 'id, userId',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns, enableSplitPayment',
  syncHistory: '++id, timestamp',
  bundles: 'id, name, active',
  bundleItems: 'id, bundleId, productId',
  bundleSlots: 'id, bundleId',
  bundleSlotOptions: 'id, slotId, productId',
  app_settings: 'id, storeName, currency, enableSplitPayment, enableExtraCharges',
  purchase_records: 'id, productId, supplierId, date'
};

export const SCHEMA_V15 = {
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
  payments: 'id, supplierId',
  stockHistory: 'id, productId, timestamp, type',
  salesTabs: 'id, userId',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns, enableSplitPayment',
  syncHistory: '++id, timestamp',
  bundles: 'id, name, active',
  bundleItems: 'id, bundleId, productId',
  app_settings: 'id, storeName, currency, enableSplitPayment, enableExtraCharges',
  purchase_records: 'id, productId, supplierId, date'
};

export const SCHEMA_V14 = {
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
  payments: 'id, supplierId',
  stockHistory: 'id, productId, timestamp, type',
  salesTabs: 'id, userId',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns, enableSplitPayment',
  syncHistory: '++id, timestamp',
  app_settings: 'id, storeName, currency, enableSplitPayment, enableExtraCharges',
  purchase_records: 'id, productId, supplierId, date'
};

// v13 shares the same schema as v14
export const SCHEMA_V13 = SCHEMA_V14;

export const SCHEMA_V12 = {
  products: 'id, name, sku, categoryId, supplierId, isDraft, trackInventory, stock',
  categories: 'id, name',
  suppliers: 'id, name',
  sales: 'id, invoiceNumber, customerId, timestamp, saleDate, status, dcNumber, extraCharges',
  customers: 'id, name, phone, email',
  expenses: 'id, categoryId, date',
  expense_categories: 'id, name',
  purchase_records: 'id, productId, supplierId, date',
  app_settings: 'id, storeName, currency, enableSplitPayment, enableExtraCharges',
  discounts: 'id, name, type, active',
  terminal_stats: 'id',
  sync_status: 'id'
};

// v11 shares the same schema as v12
export const SCHEMA_V11 = SCHEMA_V12;

export const SCHEMA_V1 = {
  products: 'id, name, sku, barcode, category, supplier',
  customers: 'id, name, email, phone',
  sales: 'id, invoiceNumber, customerId, timestamp',
  discounts: 'id, name',
  users: 'id, username, email',
  categories: 'id, name',
  suppliers: 'id, name',
  productBatches: 'id, productId',
  purchaseRecords: 'id, productId, date',
  purchaseOrders: 'id, poNumber, supplierId',
  purchaseOrderItems: 'id, poId, productId',
  supplierTransactions: 'id, supplierId',
  payments: 'id, supplierId',
  stockHistory: 'id, productId',
  salesTabs: 'id, userId',
  expenses: 'id, category, date',
  appSettings: 'id',
  syncHistory: '++id, timestamp'
};

// v2 and v4 share the same schema as v1
export const SCHEMA_V2 = SCHEMA_V1;
export const SCHEMA_V4 = SCHEMA_V1;

export const SCHEMA_V5 = {
  products: 'id, name, sku, barcode, category, supplier',
  customers: 'id, name, email, phone',
  sales: 'id, invoiceNumber, customerId, timestamp',
  discounts: 'id, name',
  users: 'id, username, email',
  categories: 'id, name',
  suppliers: 'id, name',
  productBatches: 'id, productId',
  purchaseRecords: 'id, productId, date',
  purchaseOrders: 'id, poNumber, supplierId',
  purchaseOrderItems: 'id, poId, productId',
  supplierTransactions: 'id, supplierId',
  payments: 'id, supplierId',
  stockHistory: 'id, productId',
  salesTabs: 'id, userId',
  expenses: 'id, category, date',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType',
  syncHistory: '++id, timestamp'
};

export const SCHEMA_V6 = {
  products: 'id, name, sku, barcode, category, supplier',
  customers: 'id, name, email, phone',
  sales: 'id, invoiceNumber, customerId, timestamp',
  discounts: 'id, name',
  users: 'id, username, email',
  categories: 'id, name',
  suppliers: 'id, name',
  productBatches: 'id, productId',
  purchaseRecords: 'id, productId, date',
  purchaseOrders: 'id, poNumber, supplierId',
  purchaseOrderItems: 'id, poId, productId',
  supplierTransactions: 'id, supplierId',
  payments: 'id, supplierId',
  stockHistory: 'id, productId',
  salesTabs: 'id, userId',
  expenses: 'id, category, date',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns',
  syncHistory: '++id, timestamp'
};

export const SCHEMA_V7 = {
  sales: 'id, invoiceNumber, customerId, timestamp',
  expenses: 'id, category, date'
};

export const SCHEMA_V8 = {
  salesTabs: 'id, userId'
};

export const SCHEMA_V9 = {
  sales: 'id, invoiceNumber, customerId, timestamp, status, paymentMethod',
  products: 'id, name, sku, barcode, category, supplier, stock, active',
  stockHistory: 'id, productId, timestamp, type',
  expenses: 'id, category, date, paymentMethod',
  customers: 'id, name, email, phone',
  productBatches: 'id, productId, created_at, status'
};

export const SCHEMA_V10 = {
  sales: 'id, invoiceNumber, dcNumber, customerId, timestamp, status, paymentMethod',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns, enableSplitPayment'
};

