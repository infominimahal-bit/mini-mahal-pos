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
  SupplierTransaction,
  StockHistory,
  Payment,
  PurchaseOrder,
  Bundle,
  BundleItem,
  CartItem,
  RefundRequest,
  Topping,
  VariantStockHistory,
  ProductAddon,
} from '../../types';
import { localDb, generateId, SETTINGS_ID } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { generateBarcodeValue } from '../../utils/barcode';
import { signAction, withActor } from '../actionToken';
import { mapProduct, toRemoteProduct, toRemoteStockHistory } from './mappers';
import { fetchAllPages } from './utils';
import { buildChildProduct } from './productsServiceHelpers';
import { productsServiceExtra } from './productsService.extra';

export const productsService = {
  async getAll(): Promise<Product[]> {
    const items = await localDb.products.toArray();
    return items.sort((a, b) => a.name.localeCompare(b.name));
  },

  async fetchRemote(lastSyncTime?: Date): Promise<Product[]> {
    const queryFn = () => {
      let q = supabase.from('products').select('*');
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    return data.map(mapProduct);
  },

  async getById(id: string): Promise<Product | null> {
    return await localDb.products.get(id) || null;
  },

  async create(product: Omit<Product, 'id'>): Promise<Product> {
    // DUPLICATE PREVENTION (RULE F1) — check Supabase before any local write
    let existing = null;
    if (navigator.onLine) {
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, stock')
          .ilike('name', product.name.trim())
          .maybeSingle();
        existing = data;
      } catch (err) {
        console.warn('[ProductsService] Supabase duplicate check failed, checking local database:', err);
      }
    }

    if (!existing) {
      // Fallback: Check local IndexedDB database for duplicate name (case-insensitive)
      const localExisting = await localDb.products
        .filter(p => p.name.trim().toLowerCase() === product.name.trim().toLowerCase())
        .first();

      if (localExisting) {
        existing = {
          id: localExisting.id,
          name: localExisting.name,
          stock: localExisting.stock
        };
      }
    }

    if (existing) {
      throw new Error(
        `Product "${product.name}" already exists (ID: ${existing.id}, Stock: ${existing.stock}). ` +
        `Update its stock instead of creating a duplicate.`
      );
    }

    // DUPLICATE BARCODE PREVENTION (RULE F1) — a duplicate barcode causes a 23505
    // unique-constraint failure on sync, which would block the product from ever
    // reaching the cloud. Guard both remote and local.
    if (product.barcode && product.barcode.trim()) {
      const bc = product.barcode.trim();
      if (navigator.onLine) {
        try {
          const { data: barcodeDup } = await supabase
            .from('products')
            .select('id, name, barcode')
            .eq('barcode', bc)
            .maybeSingle();
          if (barcodeDup) {
            throw new Error(
              `Barcode "${bc}" already assigned to product "${barcodeDup.name}". Use a unique barcode.`
            );
          }
        } catch (err: any) {
          if (err?.message?.includes('already assigned')) throw err;
          console.warn('[ProductsService] Barcode duplicate check failed:', err);
        }
      }
      const localDup = await localDb.products
        .filter(p => p.barcode && p.barcode.trim().toLowerCase() === bc.toLowerCase())
        .first();
      if (localDup) {
        throw new Error(
          `Barcode "${bc}" already assigned to product "${localDup.name}". Use a unique barcode.`
        );
      }
    }

    const id = generateId();
    const now = new Date();
    const barcodeVal = product.barcodeValue || product.barcode || generateBarcodeValue(product.name || id);

    // AUTO-GENERATED BARCODE UNIQUENESS (RULE F1): the random 6-digit suffix can
    // collide. For the auto-gen path (no user barcode supplied) guarantee a unique
    // value against existing local products so a scanned code never resolves the
    // WRONG product. User-supplied barcodes are validated by the guard above.
    let finalBarcodeVal = barcodeVal;
    if (!product.barcode || !product.barcode.trim()) {
      const existingBarcodes = new Set(
        (await localDb.products.toArray())
          .map(p => (p.barcodeValue || p.barcode || '').trim().toLowerCase())
          .filter(Boolean)
      );
      let attempt = 0;
      while (existingBarcodes.has(finalBarcodeVal.toLowerCase()) && attempt < 50) {
        finalBarcodeVal = generateBarcodeValue(product.name || id);
        attempt++;
      }
    }

    const newProduct = {
      ...product,
      id,
      barcodeValue: finalBarcodeVal,
      barcode: finalBarcodeVal,
      createdAt: now,
      updatedAt: now
    } as Product;

    // 1. Cloud FIRST — the product row must exist in cloud before its stock_history
    // (FK) and before any local cache write, so a failed create can never leave a
    // local-only ghost that the incremental pull would not reconcile.
    // STRIP stock ONLY when an 'initial' history entry will apply it via trigger
    // (absolute stock + trigger insert would double-count). Non-tracked products
    // (no history entry) must keep their absolute stock value (999999 infinity mode).
    const remoteCreateProduct = toRemoteProduct(newProduct);
    if (product.trackInventory && product.stock > 0) {
      delete remoteCreateProduct.stock;
    }
    await cloudWrite('products', 'create', id, remoteCreateProduct);

    // 2. Local cache write
    await localDb.products.add(newProduct);

    // 3. Stock history (if tracking enabled) — cloud first, then local cache.
    if (product.trackInventory && product.stock > 0) {
      const initialQty = Number(product.stock) || 0;

      // Also log stock history
      const logId = generateId();
      const stockLog = {
        id: logId,
        productId: id,
        type: 'initial',
        changeQty: initialQty,
        balanceAfter: initialQty,
        referenceId: generateId(),
        note: 'Initial opening stock',
        createdAt: now
      };
      await cloudWrite('stock_history', 'create', logId, toRemoteStockHistory(stockLog));
      await localDb.stockHistory.add(stockLog as any);
    }

    // 4. Create child variations if productType is 'variable'
    if (newProduct.productType === 'variable' && newProduct.variantData && newProduct.variantData.length > 0) {
      for (const vd of newProduct.variantData) {
        const childId = (vd.id && vd.id.length > 10) ? vd.id : generateId();
        const childName = `${newProduct.name} - ${vd.option1}${vd.option2 ? ` / ${vd.option2}` : ''}`;

        // Prevent duplicate child creation error
        const existingChild = await localDb.products.where('name').equalsIgnoreCase(childName.trim()).first();

        if (!existingChild) {
          const childProduct = buildChildProduct(newProduct, vd, childId, childName);

          await productsService.create(childProduct);
        }
      }
    }

    return newProduct;
  },

  ...productsServiceExtra,
};
