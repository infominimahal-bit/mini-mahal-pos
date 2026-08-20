import { supabase, enableFullAuthInit } from '../supabase';
import { salesService, seedMissingBarcodes } from '../services';
import { localDb, syncState, clearBlacklist, MAX_RETRIES, HEARTBEAT_INTERVAL } from './state';
import { syncToCloud, scheduleOfflineRetry } from './push';
import { autoRecoverErrors, reconcileStuckOps, pruneOldStockHistory, pruneGhostSales } from './maintenance';

export { isSyncEngineBusy, clearBlacklist, filterPayload, recordBlacklistedColumn, COLUMN_BLACKLIST } from './state';
export { updateSyncTime, getSyncTime } from './status';
export { syncToCloud, scheduleOfflineRetry };
export { executeOp } from './executeOp';
export { autoRecoverErrors, reconcileStuckOps, pruneOldStockHistory, pruneGhostSales } from './maintenance';

export function startSyncEngine() {
    clearBlacklist();
    pruneOldStockHistory();
    pruneGhostSales();

    setTimeout(() => {
        salesService.patchLegacySales().catch(() => { });
        seedMissingBarcodes().catch(() => { });
    }, 5000);

    syncToCloud().catch(() => { });

    window.addEventListener('online', () => {
        syncState.offlineBackoff = 0;
        syncState.offlineMode = false;
        if (syncState.offlineTimer) { clearTimeout(syncState.offlineTimer); syncState.offlineTimer = null; }
        autoRecoverErrors();
        syncToCloud({ resetRetries: true }).catch(() => { });
    });

    window.addEventListener('offline', () => {
        scheduleOfflineRetry();
        window.dispatchEvent(new Event('pendingops-changed'));
    });

    let wasOffline = false;
    setInterval(async () => {
        if (!navigator.onLine) { wasOffline = true; return; }
        if (syncState.offlineMode || wasOffline) {
            try {
                const { error } = await supabase.from('app_settings').select('id').limit(1);
                if (!error) {
                    wasOffline = false;
                    syncState.offlineMode = false;
                    syncState.offlineBackoff = 0;
                    if (syncState.offlineTimer) { clearTimeout(syncState.offlineTimer); syncState.offlineTimer = null; }
                    syncToCloud({ resetRetries: true }).catch(() => { });
                    window.dispatchEvent(new Event('online'));
                }
            } catch (err) {
                wasOffline = true;
                if (!syncState.offlineMode) { syncState.offlineMode = true; scheduleOfflineRetry(); }
            }
        }
    }, 8000);

    setInterval(() => { if (navigator.onLine) reconcileStuckOps(); }, 15 * 60 * 1000);

    setInterval(() => {
        if (navigator.onLine) {
            autoRecoverErrors();
            reconcileStuckOps();
            pruneOldStockHistory();
            pruneGhostSales();
        }
    }, 60 * 60 * 1000);

    setInterval(() => {
        if (navigator.onLine && syncState.offlineBackoff === 0) syncToCloud().catch(() => { });
    }, HEARTBEAT_INTERVAL);
}

export const syncNow = syncToCloud;

export async function retrySyncAll() {
    await localDb.pendingOps.toCollection().modify({ status: 'pending', retries: 0 });
    syncState.offlineMode = false;
    syncState.offlineBackoff = 0;
    if (syncState.offlineTimer) { clearTimeout(syncState.offlineTimer); syncState.offlineTimer = null; }
    window.dispatchEvent(new Event('pendingops-changed'));
    return syncToCloud();
}

export async function clearStuckOps() {
    await localDb.pendingOps.where('retries').aboveOrEqual(MAX_RETRIES).modify({ status: 'pending', retries: 0, autoRetryCount: 0 });
    window.dispatchEvent(new Event('pendingops-changed'));
}
