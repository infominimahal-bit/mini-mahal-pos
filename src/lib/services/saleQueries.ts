import { supabase } from '../supabase';
import { Sale } from '../../types';
import { localDb } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { mapSale, toRemoteSale } from './mappers';
import { fetchAllPages } from './utils';

export async function getAllSales(): Promise<Sale[]> {
  const sales = await localDb.sales.filter(s => s.status !== 'deleted').toArray();
  return sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function fetchRemoteSales(lastSyncTime?: Date): Promise<Sale[]> {
  if (lastSyncTime) {
    const queryFn = () => supabase
      .from('sales')
      .select('*')
      .is('deleted_at', null)
      .gte('updated_at', lastSyncTime.toISOString());
    const data = await fetchAllPages(queryFn);
    return data.map(mapSale);
  } else {
    // FULL pull. sales is the heavy table (45MB — items jsonb ~35KB/row), so
    // paginate in SMALL pages (200): a 1000-row page = ~35MB single response
    // → PostgREST statement timeout (57014 "canceling statement due to
    // statement timeout", 8s Supabase default).
    // Exclude soft-deleted sales (deleted_at set) — they are audit-only rows
    // and must never re-surface locally (tombstones remove them too).
    const queryFn = () => supabase
      .from('sales')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    const data = await fetchAllPages(queryFn, 200);
    return (data || []).map(mapSale);
  }
}

export async function searchSales(filters: {
  startDate?: Date,
  endDate?: Date,
  invoiceNumber?: string,
  customerId?: string,
  paymentMethod?: string,
  status?: string,
  cashier?: string,
  salesman?: string,
  saleType?: string
}): Promise<Sale[]> {
  try {
    let query = supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
    if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());
    if (filters.invoiceNumber) {
      query = query.or(`invoice_number.ilike.%${filters.invoiceNumber}%,receipt_number.ilike.%${filters.invoiceNumber}%,customer_name.ilike.%${filters.invoiceNumber}%`);
    }
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.cashier) query = query.eq('cashier', filters.cashier);
    if (filters.saleType) query = query.eq('sale_type', filters.saleType);
    if (filters.salesman) query = query.eq('salesman_name', filters.salesman);

    const data = await fetchAllPages(query);
    return data.map(mapSale);
  } catch (e) {
    console.warn("Cloud search failed, falling back to localDb", e);
    let sales = await localDb.sales.toArray();

    if (filters.startDate) sales = sales.filter(s => new Date(s.timestamp).getTime() >= filters.startDate!.getTime());
    if (filters.endDate) sales = sales.filter(s => new Date(s.timestamp).getTime() <= filters.endDate!.getTime());
    if (filters.invoiceNumber) {
      const query = filters.invoiceNumber.toLowerCase();
      sales = sales.filter(s =>
        (s.invoiceNumber || '').toLowerCase().includes(query) ||
        (s.receiptNumber || '').toLowerCase().includes(query) ||
        (s.customerName || '').toLowerCase().includes(query)
      );
    }
    if (filters.customerId) sales = sales.filter(s => s.customerId === filters.customerId);
    if (filters.paymentMethod) sales = sales.filter(s => s.paymentMethod === filters.paymentMethod);
    if (filters.status) sales = sales.filter(s => s.status === filters.status);
    if (filters.cashier) sales = sales.filter(s => s.cashier === filters.cashier);
    if (filters.salesman) sales = sales.filter(s => s.salesmanName === filters.salesman);
    if (filters.saleType) sales = sales.filter(s => s.saleType === filters.saleType);

    return sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200);
  }
}

export async function updateSale(id: string, updates: Partial<Sale>): Promise<Sale> {
  const existing = await localDb.sales.get(id);
  if (!existing) throw new Error('Sale not found');

  const updated = { ...existing, ...updates, updatedAt: new Date() };

  // Cloud FIRST — authoritative. Throw on failure so the local cache never diverges.
  await cloudWrite('sales', 'update', id, toRemoteSale(updated));

  await localDb.sales.put(updated);
  return updated;
}

export async function getReportSalesLocal(startDate: Date, endDate: Date): Promise<Sale[]> {
  return await localDb.sales
    .filter(s =>
      s.status !== 'refunded' &&
      s.status !== 'deleted' &&
      s.status !== 'pending' &&
      !s.notes?.includes('DRAFT_SALE') &&
      new Date(s.timestamp) >= startDate &&
      new Date(s.timestamp) <= endDate
    )
    .reverse()
    .sortBy('timestamp');
}

export async function getReportSales(startDate: Date, endDate: Date): Promise<Sale[]> {
  try {
    const all = await fetchAllPages(() => supabase
      .from('sales')
      .select('*')
      .neq('status', 'refunded')
      .neq('status', 'deleted')
      .neq('status', 'pending')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false }));

    if (!all || all.length === 0) return [];
    return (all as any[]).map(mapSale);
  } catch (_e) {
    console.warn('getReportSales: fallback to localDb'); // fallback to localDb
    return await localDb.sales
      .filter(s =>
        s.status !== 'refunded' &&
        s.status !== 'deleted' &&
        s.status !== 'pending' &&
        !s.notes?.includes('DRAFT_SALE') &&
        new Date(s.timestamp) >= startDate &&
        new Date(s.timestamp) <= endDate
      )
      .reverse()
      .sortBy('timestamp');
  }
}

export async function getReportRefundsLocal(startDate: Date, endDate: Date): Promise<Sale[]> {
  return await localDb.sales
    .filter(s =>
      (s.status === 'refunded' || s.status === 'partially_refunded') &&
      new Date(s.timestamp) >= startDate &&
      new Date(s.timestamp) <= endDate
    )
    .toArray();
}

export async function getReportRefunds(startDate: Date, endDate: Date): Promise<Sale[]> {
  try {
    const all = await fetchAllPages(() => supabase
      .from('sales')
      .select('*')
      .in('status', ['refunded', 'partially_refunded'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString()));

    if (!all || all.length === 0) return [];
    return (all as any[]).map(mapSale);
  } catch (_e) {
    console.warn('getReportRefunds: fallback to localDb'); // fallback to localDb
    return await localDb.sales
      .filter(s =>
        (s.status === 'refunded' || s.status === 'partially_refunded') &&
        new Date(s.timestamp) >= startDate &&
        new Date(s.timestamp) <= endDate
      )
      .toArray();
  }
}

export async function patchLegacySales(onProgress?: (percent: number) => void): Promise<number> {
  const allSales = await localDb.sales.toArray();
  const toUpdate: any[] = [];

  for (let i = 0; i < allSales.length; i++) {
    const sale = allSales[i];
    let needsPatch = false;
    const updatedItems = sale.items.map(item => {
      if (!item.purchaseCost || item.purchaseCost <= 0) {
        needsPatch = true;
        // Fallback to current product cost for legacy records
        const productCost = Number(item.product?.cost) || 0;
        const qty = item.weight || item.quantity;
        return {
          ...item,
          purchaseCost: productCost * qty
        };
      }
      return item;
    });

    if (needsPatch) {
      toUpdate.push({ ...sale, items: updatedItems, updatedAt: new Date() });
    }
  }

  if (toUpdate.length === 0) {
    if (onProgress) onProgress(100);
    return 0;
  }

  // Process in chunks to avoid overwhelming the database and UI
  const CHUNK_SIZE = 50;
  for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + CHUNK_SIZE);

    const remoteChunk = chunk
      .filter(sale => !sale.invoiceNumber?.startsWith('DRAFT-'))
      .map(toRemoteSale);

    // Cloud FIRST — authoritative repair. Throw on failure keeps the local cache untouched.
    for (const s of remoteChunk) {
      await cloudWrite('sales', 'update', (s as any).id, s);
    }

    await localDb.sales.bulkPut(chunk);

    if (onProgress) {
      onProgress(Math.floor(((i + chunk.length) / toUpdate.length) * 100));
    }

    // Add a small delay to allow UI to breathe
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (onProgress) onProgress(100);
  return toUpdate.length;
}
