import { supabase } from './supabase';
import { localDb } from './localDb';

export const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
export const BACKOFF_INITIAL = 5 * 1000; // 5s
export const BACKOFF_MAX = 60 * 1000; // 60s
export const SYNC_TIMEOUT = 120 * 1000; // 120s

export const MAX_RETRIES = 25;
export const MAX_AUTO_RETRY = 12;

const COLUMN_BLACKLIST: Record<string, Set<string>> = {};

export function clearBlacklist(entity?: string) {
    if (entity) {
        delete COLUMN_BLACKLIST[entity];
    } else {
        for (const key in COLUMN_BLACKLIST) delete COLUMN_BLACKLIST[key];
    }
}

function filterPayload(entity: string, payload: any) {
    if (!payload || typeof payload !== 'object') return payload;

    const blacklist = COLUMN_BLACKLIST[entity];
    const filtered: Record<string, any> = {};

    for (const key in payload) {
        if (payload[key] === undefined) continue;

        if (payload[key] === null) {
            const notNullColumns = ['id', 'created_at', 'updated_at', 'name', 'price', 'sku', 'category', 'total', 'subtotal', 'quantity', 'invoice_number', 'items'];
            if (notNullColumns.includes(key)) continue;
        }

        if (blacklist && blacklist.has(key)) {
            continue;
        } else {
            filtered[key] = payload[key];
        }
    }

    return filtered;
}

function recordBlacklistedColumn(entity: string, errorMsg: string) {
    if (entity === 'app_settings') return false;
    const match = errorMsg.match(/Could not find the '([^']+)' column of '([^']+)'/);
    if (match) {
        const col = match[1];
        if (!COLUMN_BLACKLIST[entity]) COLUMN_BLACKLIST[entity] = new Set();
        COLUMN_BLACKLIST[entity].add(col);
        return true;
    }
    return false;
}

export async function updateSyncTime() {
    try {
        const now = new Date().toISOString();
        localStorage.setItem('local_handshake', now);
        window.dispatchEvent(new Event('sync-status-changed'));
    } catch (err) {}
}

export async function getSyncTime(): Promise<Date | null> {
    try {
        const { data, error } = await supabase.from('app_settings').select('updated_at').limit(1).maybeSingle();
        if (error || !data || !data.updated_at) return null;
        return new Date(data.updated_at);
    } catch (err) {
        return null;
    }
}

async function pruneOldStockHistory() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const all = await localDb.stockHistory.toArray();
    const old = all.filter(h => h.createdAt && new Date(h.createdAt).getTime() < ninetyDaysAgo.getTime());
    if (old.length > 0) await localDb.stockHistory.bulkDelete(old.map(h => h.id));
}

async function pruneGhostSales() {
    try {
        const allSales = await localDb.sales.toArray();
        const ghostSales = allSales.filter(s => {
            const hasNoItems = !s.items || s.items.length === 0;
            const hasZeroTotal = !s.total || s.total === 0;
            const ts = s.updatedAt || s.createdAt || s.timestamp;
            const isOldEnough = ts && (Date.now() - new Date(ts).getTime()) > 60 * 60 * 1000;
            return hasNoItems && hasZeroTotal && isOldEnough;
        });

        if (ghostSales.length > 0) {
            const pendingOps = await localDb.pendingOps.where('entity').equals('sales').toArray();
            const pendingIds = new Set(pendingOps.map(op => op.entityId));
            const safeToDelete = ghostSales.filter(s => !pendingIds.has(s.id));
            if (safeToDelete.length > 0) await localDb.sales.bulkDelete(safeToDelete.map(s => s.id));
        }
    } catch (err) {}
}

export { filterPayload, recordBlacklistedColumn, pruneOldStockHistory, pruneGhostSales };
