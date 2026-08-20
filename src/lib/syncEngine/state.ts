import { localDb, SETTINGS_ID } from '../localDb';
export const HEARTBEAT_INTERVAL = 30 * 1000;
export const BACKOFF_INITIAL = 5 * 1000;
export const BACKOFF_MAX = 60 * 1000;
export const SYNC_TIMEOUT = 120 * 1000;

export const MAX_RETRIES = 25;
export const MAX_AUTO_RETRY = 12;

export const syncState = {
    isSyncing: false,
    syncNeeded: false,
    offlineBackoff: 0,
    offlineTimer: null as ReturnType<typeof setTimeout> | null,
    offlineMode: false,
};

export const COLUMN_BLACKLIST: Record<string, Set<string>> = {};

export function isSyncEngineBusy(): boolean {
    return syncState.isSyncing;
}

export function clearBlacklist(entity?: string) {
    if (entity) {
        delete COLUMN_BLACKLIST[entity];
    } else {
        for (const key in COLUMN_BLACKLIST) delete COLUMN_BLACKLIST[key];
    }
}

export function filterPayload(entity: string, payload: any) {
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

export function recordBlacklistedColumn(entity: string, errorMsg: string) {
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

export { localDb, SETTINGS_ID };
