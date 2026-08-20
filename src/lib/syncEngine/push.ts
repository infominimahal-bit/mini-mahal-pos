import { supabase, enableFullAuthInit } from '../supabase';
import { mapProduct, mapCustomer } from '../services';
import { localDb, SETTINGS_ID, syncState, MAX_RETRIES, MAX_AUTO_RETRY, BACKOFF_INITIAL, BACKOFF_MAX, SYNC_TIMEOUT } from './state';
import { updateSyncTime } from './status';
import { executeOp } from './executeOp';

export function scheduleOfflineRetry() {
    if (syncState.offlineTimer) return;
    const delay = syncState.offlineBackoff > 0 ? syncState.offlineBackoff : BACKOFF_INITIAL;
    syncState.offlineTimer = setTimeout(() => {
        syncState.offlineTimer = null;
        if (navigator.onLine) {
            syncState.offlineBackoff = 0;
            syncState.offlineMode = false;
            syncToCloud().catch(() => { });
        } else {
            syncState.offlineBackoff = Math.min((syncState.offlineBackoff || BACKOFF_INITIAL) * 2, BACKOFF_MAX);
            scheduleOfflineRetry();
        }
    }, delay);
}

export async function syncToCloud(options: { resetRetries?: boolean } = {}) {
    if (syncState.offlineMode) return;
    if (!navigator.onLine) { scheduleOfflineRetry(); return; }
    if (syncState.isSyncing) { syncState.syncNeeded = true; return; }
    if (syncState.offlineBackoff > 0) { scheduleOfflineRetry(); return; }

    syncState.isSyncing = true;
    syncState.syncNeeded = false;

    let syncTimedOut = false;
    const syncTimeout = setTimeout(() => {
        syncTimedOut = true;
        syncState.offlineMode = true;
    }, SYNC_TIMEOUT);

    try {
        if (options.resetRetries) {
            await localDb.pendingOps.toCollection().modify({ retries: 0, status: 'pending' });
            window.dispatchEvent(new Event('pendingops-changed'));
        }

        while (true) {
            if (syncTimedOut) return;
            const pending = await localDb.pendingOps.toArray();
            if (pending.length === 0) {
                if (syncState.syncNeeded) { syncState.syncNeeded = false; continue; }
                break;
            }

            const processableItems = pending.filter(op =>
                (op.retries || 0) < MAX_RETRIES &&
                (op.status !== 'error' || ((op as any).autoRetryCount || 0) < MAX_AUTO_RETRY)
            );

            if (processableItems.length === 0) {
                if (syncState.syncNeeded) { syncState.syncNeeded = false; continue; }
                break;
            }

            processableItems.sort((a, b) => {
                const getPriority = (entity: string) => (entity === 'products' ? 1 : 2);
                return getPriority(a.entity) - getPriority(b.entity) || a.createdAt - b.createdAt;
            });

            for (const op of processableItems) {
                const exists = await localDb.pendingOps.get(op.id!);
                if (!exists) continue;

                if (op.entityId === SETTINGS_ID && op.entity !== 'app_settings') {
                    await localDb.pendingOps.delete(op.id!);
                    window.dispatchEvent(new Event('pendingops-changed'));
                    continue;
                }

                try {
                    await executeOp(op);
                    const finalOp = await localDb.pendingOps.get(op.id!);
                    if (finalOp && finalOp.status !== 'error') {
                        await localDb.pendingOps.delete(op.id!);
                        if (op.opType !== 'delete' && ['products', 'customers', 'suppliers'].includes(op.entity)) {
                            const table = op.entity;
                            supabase.from(table).select('*').eq('id', op.entityId).maybeSingle().then(({ data }) => {
                                if (data) {
                                    const localTable = op.entity === 'products' ? localDb.products : op.entity === 'customers' ? localDb.customers : localDb.suppliers;
                                    const mapped = op.entity === 'products' ? mapProduct(data) : op.entity === 'customers' ? mapCustomer(data) : data;
                                    (localTable as any).put(mapped).catch(() => { });
                                }
                            }).catch(() => {});
                        }
                    }
                    await localDb.syncHistory.add({ timestamp: Date.now(), itemsSynced: 1, entities: [op.entity], status: 'success' });
                    window.dispatchEvent(new Event('pendingops-changed'));
                } catch (err: any) {
                    const exactCode = err?.code || 'UNKNOWN';
                    const exactDetails = err?.details || '';
                    const exactMessage = err?.message || JSON.stringify(err);
                    const errorMsg = exactDetails ? `${exactMessage} (${exactDetails}) [Code: ${exactCode}]` : exactMessage;

                    console.error('%c SYNC ERROR ', 'background: red; color: white; font-weight: bold;', {
                        entity: op.entity,
                        entityId: op.entityId,
                        opType: op.opType,
                        error: err,
                        formattedMessage: errorMsg
                    });

                    const isAuthError = errorMsg.toLowerCase().includes('401') || errorMsg.toLowerCase().includes('jwt') || errorMsg.toLowerCase().includes('unauthorized') || err?.status === 401;

                    if (isAuthError) {
                        enableFullAuthInit();
                        await localDb.pendingOps.update(op.id!, { retries: (op.retries || 0) + 1, lastError: errorMsg });
                        window.dispatchEvent(new Event('pendingops-changed'));
                        continue;
                    }

                    const isNetworkError = !navigator.onLine || errorMsg.toLowerCase().includes('fetch') || errorMsg.toLowerCase().includes('networkerror');
                    if (isNetworkError) {
                        syncState.offlineMode = true;
                        syncState.offlineBackoff = Math.min((syncState.offlineBackoff || BACKOFF_INITIAL) * 2, BACKOFF_MAX);
                        syncState.isSyncing = false;
                        scheduleOfflineRetry();
                        return;
                    }

                    syncState.offlineBackoff = 0;
                    const newRetries = (op.retries || 0) + 1;
                    const status = newRetries >= MAX_RETRIES ? 'error' : 'failed';
                    await localDb.pendingOps.update(op.id!, {
                        retries: newRetries,
                        status,
                        autoRetryCount: ((op as any).autoRetryCount || 0) + 1,
                        lastError: errorMsg
                    });
                    window.dispatchEvent(new Event('pendingops-changed'));
                }
            }
        }

        clearTimeout(syncTimeout);
        syncState.offlineBackoff = 0;
        syncState.offlineMode = false;
        if (syncState.offlineTimer) { clearTimeout(syncState.offlineTimer); syncState.offlineTimer = null; }
        await updateSyncTime();
        enableFullAuthInit();
    } finally {
        clearTimeout(syncTimeout);
        syncState.isSyncing = false;
    }
}
