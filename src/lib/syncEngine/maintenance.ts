import { localDb, syncState, MAX_AUTO_RETRY, MAX_RETRIES } from './state';
import { syncToCloud } from './push';

async function autoRecoverErrors() {
    const errorOps = await localDb.pendingOps.where('status').equals('error').toArray();
    let recoveredCount = 0;

    for (const op of errorOps) {
        const isPermanent = op.errorMessage?.includes('Orphaned') || op.errorMessage?.includes('Permission') || op.lastError?.includes('foreign key');
        const autoRetryCount = (op as any).autoRetryCount || 0;

        if (!isPermanent && autoRetryCount < MAX_AUTO_RETRY) {
            await localDb.pendingOps.update(op.id!, { status: 'pending', retries: 0, autoRetryCount: autoRetryCount + 1 });
            recoveredCount++;
        }
    }
    if (recoveredCount > 0) {
        window.dispatchEvent(new Event('pendingops-changed'));
        syncToCloud().catch(() => { });
    }
}

async function reconcileStuckOps() {
    const stuck = await localDb.pendingOps.where('status').equals('error').filter(op => ((op as any).autoRetryCount || 0) >= MAX_AUTO_RETRY).toArray();
    let reQueued = 0;
    for (const op of stuck) {
        const msg = (op.lastError || op.errorMessage || '').toLowerCase();
        const isPermanent = msg.includes('orphaned') || msg.includes('permission') || msg.includes('foreign key') || msg.includes('check constraint');
        if (isPermanent) continue;

        await localDb.pendingOps.update(op.id!, { status: 'pending', retries: 0 });
        reQueued++;
    }
    if (reQueued > 0) {
        window.dispatchEvent(new Event('pendingops-changed'));
        syncToCloud().catch(() => { });
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

export { autoRecoverErrors, reconcileStuckOps, pruneOldStockHistory, pruneGhostSales };
