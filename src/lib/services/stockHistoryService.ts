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

export const stockHistoryService = {
  async getAll(): Promise<StockHistory[]> {
    const items = await localDb.stockHistory.toArray();
    return items.map(mapStockHistory).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  async fetchRemote(lastSyncTime?: Date): Promise<StockHistory[]> {
    const queryFn = () => {
      let q = supabase.from('stock_history').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    let data;
    try {
      data = await fetchAllPages(queryFn);
    } catch {
      // Fallback: fetch all if updated_at column doesn't exist
      console.warn('[stockHistory] Delta sync failed, fetching all');
      data = await fetchAllPages(() => supabase.from('stock_history').select('*'));
    }
    return data.map(mapStockHistory);
  }
};

/**
 * VARIANT MOVEMENT LEDGER (F22 — UNIVERSAL single source of truth)
 * Applies a variant-level stock change: updates local products.variantData[].stock
 * and appends ONE variant_stock_history row (cloud variant_data[].stock is updated
 * by the variant_stock_history trigger).
 *
 * Callers: purchaseRecordsService.create/delete (variant restock), sales/returns
 * (existing sale path mirrors this pattern), ProductDetailHub (variant stock edit).
 */
