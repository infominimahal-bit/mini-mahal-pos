import { supabase } from '../supabase';
import {
  PurchaseRecord,
} from '../../types';
import { localDb, generateId } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { mapPurchaseRecord, toRemoteProduct, toRemotePurchaseRecord, toRemoteStockHistory } from './mappers';
import { fetchAllPages } from './utils';
import { applyVariantStockMovement } from './applyVariantStockMovement';

export const purchaseRecordsService = {
  async getAll(): Promise<PurchaseRecord[]> {
    return await localDb.purchaseRecords.toArray();
  },

  async create(record: Omit<PurchaseRecord, 'id'>, supplierBillData?: any): Promise<PurchaseRecord> {
    const id = generateId();
    const now = new Date();
    const newRecord = { ...record, id, createdAt: now } as PurchaseRecord;

    // ---- Gather the intended changes (NO local writes yet) --------------------
    // NOTE: stock update is intentionally performed HERE so callers that don't manage
    // inventory themselves (PurchaseHistory quick-entry) get correct counts. Callers
    // that ALREADY manage stock (BatchStockInSystem) must NOT call this path.
    let product: any = null;
    let histEntry: any = null;
    let costUpdate: any = {};
    let newStock = 0;
    if (record.productId) {
      product = await localDb.products.get(record.productId);
      if (product && record.type !== 'Adjustment') {
        newStock = (product.stock || 0) + record.quantity;
        // If it's a stock-in purchase, update the product's last cost price.
        costUpdate = record.quantity > 0 && record.costPrice > 0 ? { cost: record.costPrice } : {};
        histEntry = {
          id: generateId(),
          productId: product.id,
          changeQty: record.quantity,
          type: record.quantity > 0 ? 'stock_in' as const : 'adjustment_out' as const,
          referenceId: id,
          note: `${record.type || 'Stock In'}: ${record.supplier || 'Direct'}`,
          balanceAfter: newStock,
          cashierName: record.addedBy || 'System',
          createdAt: now
        };
      }
    }

    let txId: string | null = null;
    let supplierTxLoc: any = null;
    if (supplierBillData) {
      txId = generateId();
      supplierTxLoc = {
        id: txId,
        supplierId: supplierBillData.supplierId,
        type: supplierBillData.sourceType === 'opening_balance' ? 'opening_balance' : 'purchase',
        sourceType: supplierBillData.sourceType,
        amount: supplierBillData.amount,
        note: supplierBillData.note,
        referenceId: id,
        createdAt: new Date()
      };
    }

    // Mega payload for the atomic commit_restock RPC.
    const megaPayload: any = { p_purchase_record: toRemotePurchaseRecord(newRecord) };
    if (histEntry) megaPayload.p_stock_history = [toRemoteStockHistory(histEntry)];
    if (supplierTxLoc) {
      megaPayload.p_supplier_transaction = {
        id: txId,
        supplier_id: supplierTxLoc.supplierId,
        type: supplierTxLoc.type,
        source_type: supplierTxLoc.sourceType,
        amount: supplierTxLoc.amount,
        reference_id: id,
        note: supplierTxLoc.note
      };
    }

    // 1. Cloud FIRST — atomic commit_restock (purchase_record + stock_history +
    // supplier_transaction). The stock_history insert drives cloud product.stock via
    // trigger. Throws on failure so the local cache never diverges.
    await cloudWrite('purchase_records', 'create', id, megaPayload);

    // 1b. Cost-only product field update — stock STRIPPED so the trigger owns stock.
    if (product && Object.keys(costUpdate).length > 0) {
      const remotePurchaseCostPayload = toRemoteProduct({ ...product, ...costUpdate, updatedAt: now });
      delete remotePurchaseCostPayload.stock;
      await cloudWrite('products', 'update', product.id, { ...remotePurchaseCostPayload, id: product.id });
    }

    // 2. Local cache writes (cloud already authoritative).
    if (product && histEntry) {
      await localDb.products.update(product.id, { stock: newStock, ...costUpdate, updatedAt: now });
      await localDb.stockHistory.add(histEntry);
    }
    if (supplierTxLoc) await localDb.supplierTransactions.add(supplierTxLoc);
    await localDb.purchaseRecords.add(newRecord);

    // 3. F22 — VARIANT-TARGETED RESTOCK: mirror the same change at variant level.
    // Self-contained cloud-first (writes variant_stock_history → cloud trigger + local).
    if (record.productId && record.variantId && product) {
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
    const now = new Date();
    let product: any = null;
    let histEntry: any = null;
    let newStock = 0;
    if (record && record.productId) {
      product = await localDb.products.get(record.productId);
      if (product) {
        // UNIVERSAL single-reversal: deleting ANY purchase record (Stock IN, Adjustment, etc.)
        // reverses its signed stock effect exactly once and logs an audit entry.
        // Callers MUST NOT reverse again outside this service.
        newStock = (product.stock || 0) - (record.quantity || 0);
        histEntry = {
          id: generateId(),
          productId: product.id,
          changeQty: -(record.quantity || 0),
          type: 'adjustment_out' as const,
          referenceId: id,
          note: `Deleted Purchase Record (${record.type || 'Stock IN'}): ${record.supplier || 'Direct'}`,
          balanceAfter: newStock,
          cashierName: 'System',
          createdAt: now
        };
      }
    }

    // Reverse the linked supplier payable (if this stock-in posted one), so the
    // supplier balance is NOT left inflated after the record is deleted.
    const linkedBill = (await localDb.supplierTransactions.toArray()).find(t => t.referenceId === id);

    // 1. Cloud FIRST — stock reversal ledger, supplier bill delete, record delete.
    // The stock_history insert drives cloud product.stock via trigger. Each cloud
    // write throws on failure so the local cache never diverges.
    if (histEntry) await cloudWrite('stock_history', 'create', histEntry.id, toRemoteStockHistory(histEntry));
    if (linkedBill) await cloudWrite('supplier_transactions', 'delete', linkedBill.id, {});
    await cloudWrite('purchase_records', 'delete', id, {});

    // 2. Local cache mirror (cloud already authoritative).
    if (product && histEntry) {
      await localDb.products.update(product.id, { stock: newStock, updatedAt: now });
      await localDb.stockHistory.add(histEntry);
    }
    if (linkedBill) await localDb.supplierTransactions.delete(linkedBill.id);
    await localDb.purchaseRecords.delete(id);

    // 3. F22 — VARIANT reversal (single reversal, F12): the stock-in that targeted
    // a variant is reversed exactly once at variant level too. Self-contained cloud-first.
    if (record && record.productId && record.variantId && product) {
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
  },
};

