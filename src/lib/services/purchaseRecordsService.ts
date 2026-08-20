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
import { mapStockHistory, toRemoteVariantStockHistory, mapPurchaseRecord, toRemoteProduct, toRemotePurchaseRecord, toRemoteStockHistory } from './mappers';
import { fetchAllPages } from './utils';
import { applyStockMovementsRemote } from './atomicOps';
import { applyVariantStockMovement } from './applyVariantStockMovement';

export const purchaseRecordsService = {
  async getAll(): Promise<PurchaseRecord[]> {
    return await localDb.purchaseRecords.toArray();
  },

  async create(record: Omit<PurchaseRecord, 'id'>): Promise<PurchaseRecord> {
    const id = generateId();
    const now = new Date();
    const newRecord = { ...record, id, createdAt: now } as PurchaseRecord;

    // Update product stock + batches if productId provided
    // NOTE: Stock update is intentionally performed HERE so that callers that don't
    // manage inventory themselves (PurchaseHistory quick-entry) get correct counts.
    // Callers that ALREADY manage stock (BatchStockInSystem) must NOT call this path.
    if (record.productId) {
      const product = await localDb.products.get(record.productId);
      if (product && record.type !== 'Adjustment') {
        const newStock = (product.stock || 0) + record.quantity;

        // If it's a stock-in purchase, update the product's last cost price
        const costUpdate = record.quantity > 0 && record.costPrice > 0
          ? { cost: record.costPrice }
          : {};

        await localDb.products.update(product.id, {
          stock: newStock,
          ...costUpdate,
          updatedAt: now
        });

        if (Object.keys(costUpdate).length > 0) {
          // STRIP stock — cloud stock is updated ONLY via stock_history trigger (avoids double-count)
          const remotePurchaseCostPayload = toRemoteProduct(
            { ...product, ...costUpdate, updatedAt: now }
          );
          delete remotePurchaseCostPayload.stock;
          await queueOp('products', 'update', product.id, remotePurchaseCostPayload);
        }

        // Log stock movement to stock_history for full audit trail (local first, always)
        const histId = generateId();
        const histEntry = {
          id: histId,
          productId: product.id,
          changeQty: record.quantity,
          type: record.quantity > 0 ? 'stock_in' as const : 'adjustment_out' as const,
          referenceId: id,
          note: `${record.type || 'Stock In'}: ${record.supplier || 'Direct'}`,
          balanceAfter: newStock,
          cashierName: record.addedBy || 'System',
          createdAt: now
        };
        await localDb.stockHistory.add(histEntry);

        // (B) HARDENING: commit the stock movement atomically via RPC when online
        // (trigger updates cloud product.stock). Falls back to the reliable queue
        // when offline / RPC unavailable. Idempotent ids make any re-apply a no-op.
        const onlinePurchase = typeof navigator === 'undefined' || navigator.onLine;
        if (onlinePurchase) {
          const committed = await applyStockMovementsRemote([{
            id: histId,
            product_id: product.id,
            change_qty: record.quantity,
            type: record.quantity > 0 ? 'stock_in' : 'adjustment_out',
            note: histEntry.note,
            variant_id: '',
            variant_label: '',
            cashier_name: record.addedBy || 'System',
          }]);
          if (!committed) {
            await queueOp('stock_history', 'create', histId, toRemoteStockHistory(histEntry));
          }
        } else {
          await queueOp('stock_history', 'create', histId, toRemoteStockHistory(histEntry));
        }
      }

      // F22 — VARIANT-TARGETED RESTOCK: mirror the same change at variant level.
      // One signed movement per variant → variant_stock_history trigger updates
      // cloud products.variant_data[].stock; local updated here in the same call.
      if (record.variantId) {
        await applyVariantStockMovement({
          product,
          variantId: record.variantId,
          variantLabel: record.variantLabel,
          changeQty: record.quantity,
          type: 'purchase',
          referenceId: id,
          note: `Stock In: ${record.supplier || 'Direct'}${record.variantLabel ? ` (${record.variantLabel})` : ''}`,
          cashierName: record.addedBy || 'System',
          createdAt: now
        });
      }
    }

    // Save Record Locally + Queue sync
    await localDb.purchaseRecords.add(newRecord);
    await queueOp('purchase_records', 'create', id, toRemotePurchaseRecord(newRecord));
    return newRecord;
  },

  async fetchRemote(lastSyncTime?: Date): Promise<PurchaseRecord[]> {
    const queryFn = () => {
      let q = supabase.from('purchase_records').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapPurchaseRecord);
  },

  async delete(id: string): Promise<void> {
    const record = await localDb.purchaseRecords.get(id);
    if (record && record.productId) {
      const product = await localDb.products.get(record.productId);
      if (product) {
        // UNIVERSAL single-reversal: deleting ANY purchase record (Stock IN, Adjustment, etc.)
        // reverses its signed stock effect exactly once and logs an audit entry.
        // Callers MUST NOT reverse again outside this service.
        const now = new Date();
        const newStock = (product.stock || 0) - (record.quantity || 0);

        await localDb.products.update(product.id, {
          stock: newStock,
          updatedAt: now
        });

        const histId = generateId();
        const histEntry = {
          id: histId,
          productId: product.id,
          changeQty: -(record.quantity || 0),
          type: 'adjustment_out' as const,
          referenceId: id,
          note: `Deleted Purchase Record (${record.type || 'Stock IN'}): ${record.supplier || 'Direct'}`,
          balanceAfter: newStock,
          cashierName: 'System',
          createdAt: now
        };
        await localDb.stockHistory.add(histEntry);
        await queueOp('stock_history', 'create', histId, toRemoteStockHistory(histEntry));

        // F22 — VARIANT reversal (single reversal, F12): the stock-in that targeted
        // a variant is reversed exactly once at variant level too.
        if (record.variantId) {
          await applyVariantStockMovement({
            product,
            variantId: record.variantId,
            variantLabel: record.variantLabel,
            changeQty: -(record.quantity || 0),
            type: 'adjustment',
            referenceId: id,
            note: `Deleted Purchase Record (${record.type || 'Stock IN'}): ${record.supplier || 'Direct'} (${record.variantLabel || 'variant'})`,
            cashierName: 'System',
            createdAt: now
          });
        }
      }
    }

    // Reverse the linked supplier payable (if this stock-in posted one), so the
    // supplier balance is NOT left inflated after the record is deleted.
    const linkedBill = (await localDb.supplierTransactions.toArray()).find(t => t.referenceId === id);
    if (linkedBill) {
      await localDb.supplierTransactions.delete(linkedBill.id);
      await queueOp('supplier_transactions', 'delete', linkedBill.id, {});
    }

    await localDb.purchaseRecords.delete(id);
    await queueOp('purchase_records', 'delete', id, {});
  },
};

