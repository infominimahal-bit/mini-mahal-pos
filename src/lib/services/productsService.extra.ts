import { supabase, adminUserAction } from '../supabase';
import {
  Product,
  Customer,
  Sale,
  Discount,
  User,
  AppSettings,
  SalesTab,
  Expense,
  Category,
  Supplier,
  PurchaseRecord,
  ProductBatch,
  SupplierTransaction,
  StockHistory,
  Payment,
  PurchaseOrder,
  Bundle,
  BundleItem,
  CartItem,
  RefundRequest,
  Topping,
  ExtraTopping,
  VariantStockHistory,
  ProductAddon,
} from '../../types';
import { localDb, queueOp, generateId, SETTINGS_ID } from '../localDb';
import { generateBarcodeValue } from '../../utils/barcode';
import { signAction, withActor } from '../actionToken';
import { mapProduct, toRemoteProduct, toRemoteStockHistory } from './mappers';
import { fetchAllPages } from './utils';
import { buildChildProduct } from './productsServiceHelpers';

export const productsServiceExtra = {
  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const existing = await localDb.products.get(id);
    if (!existing) throw new Error('Product not found');

    const now = new Date();
    const updated = { ...existing, ...updates, updatedAt: now };

    // Keep LOCAL stock (scalar + per-variant) intact. Stock is ledger-driven via
    // stock_history / variant_stock_history triggers on the CLOUD, and the remote
    // payload below is already stripped of stock (remotePayload.stock / remoteV.stock
    // deleted), so the cloud ledger stays authoritative while the local cache keeps
    // its real on-device count (fixes A2: local stock was being wiped to undefined).

    // 1. Local Update
    await localDb.products.put(updated);

    // 2. Queue for Sync — send FULL product except stock (stock is handled by stock_history triggers)
    const remotePayload = toRemoteProduct(updated);
    delete remotePayload.stock;
    delete remotePayload.variant_data; // Let variant_stock_history triggers handle variant stock

    // We must re-include variant_data WITHOUT stock fields if we want to sync other variant properties (like price/cost)
    if (updated.variantData) {
      remotePayload.variant_data = updated.variantData.map(v => {
        const remoteV = { ...v };
        delete remoteV.stock; // strip stock to prevent overwriting trigger
        return remoteV;
      });
    }

    await queueOp('products', 'update', id, remotePayload);

    // 3. Update/Create child variations if productType is 'variable'
    if (updated.productType === 'variable' && updated.variantData) {
      const existingChildren = await localDb.products.where('parentId').equals(id).toArray();
      const childNamesKeep = new Set();

      for (const vd of updated.variantData) {
        const childName = `${updated.name} - ${vd.option1}${vd.option2 ? ` / ${vd.option2}` : ''}`;
        childNamesKeep.add(childName);

        // Find existing child by ID or Name
        const existingChild = existingChildren.find(c => c.id === vd.id || c.name === childName);

        if (existingChild) {
          // Update child (don't override stock directly here, stock is managed by stock history)
          await productsService.update(existingChild.id, {
            name: childName,
            sku: vd.barcode || existingChild.sku,
            barcode: vd.barcode || existingChild.barcode,
            barcodeValue: vd.barcode || existingChild.barcodeValue,
            price: vd.priceOverride ?? updated.price,
            cost: vd.cost ?? updated.cost,
            trackInventory: true
          });
        } else {
          // Create new child
          const childId = (vd.id && vd.id.length > 10) ? vd.id : generateId();
          const childProduct = buildChildProduct(updated, vd, childId, childName);

          await productsService.create(childProduct);
        }
      }

      // Delete removed variations
      for (const child of existingChildren) {
        if (!childNamesKeep.has(child.name)) {
          await productsService.delete(child.id);
        }
      }
    }

    return updated;
  },

  async delete(id: string): Promise<void> {
    await localDb.productBatches.where('productId').equals(id).delete();
    await localDb.stockHistory.where('productId').equals(id).delete();
    await localDb.productAddons.where('productId').equals(id).delete();
    await localDb.productAddons.where('addonProductId').equals(id).delete();
    await localDb.products.delete(id);
    queueOp('products', 'delete', id, {});
  },

  async bulkDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      await localDb.productBatches.where('productId').equals(id).delete();
      await localDb.stockHistory.where('productId').equals(id).delete();
      await localDb.productAddons.where('productId').equals(id).delete();
      await localDb.productAddons.where('addonProductId').equals(id).delete();
    }
    await localDb.products.bulkDelete(ids);
    for (const id of ids) {
      queueOp('products', 'delete', id, {});
    }
  },

  async bulkUpdate(ids: string[], updates: Partial<Product>): Promise<void> {
    const now = new Date();

    // Log per-product price-change history if price is being changed
    if (updates.price !== undefined) {
      const products = await localDb.products.where('id').anyOf(ids).toArray();
      for (const product of products) {
        if (product.price !== updates.price) {
          const histId = generateId();
          const histEntry = {
            id: histId,
            productId: product.id,
            changeQty: 0,
            type: 'adjustment' as const,
            note: `Batch Price Change: ${product.price} → ${updates.price}`,
            balanceAfter: product.stock || 0,
            cashierName: 'Bulk Edit',
            createdAt: now
          };
          await localDb.stockHistory.add(histEntry);
          await queueOp('stock_history', 'create', histId, toRemoteStockHistory(histEntry));
        }
      }
    }

    await localDb.products.where('id').anyOf(ids).modify({ ...updates, updatedAt: now });
    for (const id of ids) {
      await queueOp('products', 'update', id, toRemoteProduct({ ...updates, updatedAt: now }));
    }
  },

  async adjustStock(id: string, delta: number, note: string = 'Adjustment'): Promise<void> {
    const product = await localDb.products.get(id);
    if (!product) return;

    const newStock = (product.stock || 0) + delta;
    const now = new Date();

    await localDb.products.put({ ...product, stock: newStock, updatedAt: now });
    // STRIP stock — cloud stock is updated ONLY via stock_history trigger (avoids double-count)
    const remoteAdjustPayload = toRemoteProduct({ stock: newStock, updatedAt: now });
    delete remoteAdjustPayload.stock;
    await queueOp('products', 'update', id, remoteAdjustPayload);

    const histId = generateId();
    const historyEntry = {
      id: histId,
      productId: id,
      changeQty: delta,
      type: 'adjustment',
      note,
      balanceAfter: newStock,
      createdAt: now
    };
    await localDb.stockHistory.add(historyEntry);
    await queueOp('stock_history', 'create', histId, toRemoteStockHistory(historyEntry));
  }
};

/**
 * Customers Service
 */
