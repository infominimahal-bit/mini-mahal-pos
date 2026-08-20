import { supabase } from './supabase';
import { localDb } from './localDb';
import { fetchAllPages } from './services';
import { PullEntity, PullDef, PULL_DEFS } from './pullDefs';

const PULL_INTERVAL = 15_000;
const LAST_PULL_KEY = 'cloud_last_pull_v1';

let _pullRunning = false;
let _timer: ReturnType<typeof setInterval> | null = null;
let _channel: ReturnType<typeof supabase.channel> | null = null;
let _onChanged: ((entities: PullEntity[]) => void) | null = null;
let _sessionActive = false;

export function getLastPullTime(): Date {
  const raw = localStorage.getItem(LAST_PULL_KEY);
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

export function setLastPullTime(d: Date = new Date()) {
  localStorage.setItem(LAST_PULL_KEY, d.toISOString());
}

export function resetLastPullTime() {
  setLastPullTime(new Date(0));
}

export async function waitForPullIdle(maxMs = 30000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (_pullRunning && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function hasPendingOpsFor(entity: PullEntity, id: string): Promise<boolean> {
  const pending = await localDb.pendingOps
    .where('[entity+entityId]')
    .equals([entity, id])
    .first();
  return !!pending;
}

async function applyTombstones(since: Date): Promise<PullEntity[]> {
  const changed: PullEntity[] = [];
  try {
    const tombs = await fetchAllPages(() => {
      let q = supabase.from('row_tombstones').select('table_name, ref_id');
      if (since && since.getTime() > 0) q = q.gte('deleted_at', since.toISOString());
      return q;
    });
    if (!tombs || tombs.length === 0) return changed;

    const grouped = new Map<string, string[]>();
    for (const t of tombs) {
      if (!t || !t.table_name || !t.ref_id) continue;
      const list = grouped.get(t.table_name) || [];
      list.push(t.ref_id);
      grouped.set(t.table_name, list);
    }

    const tableMap: Record<string, { entity: PullEntity; table: any }> = {
      products: { entity: 'products', table: localDb.products },
      customers: { entity: 'customers', table: localDb.customers },
      sales: { entity: 'sales', table: localDb.sales },
      expenses: { entity: 'expenses', table: localDb.expenses },
      suppliers: { entity: 'suppliers', table: localDb.suppliers },
      categories: { entity: 'categories', table: localDb.categories },
      discounts: { entity: 'discounts', table: localDb.discounts },
      purchase_records: { entity: 'purchase_records', table: localDb.purchaseRecords },
      salesmen: { entity: 'salesmen', table: localDb.salesmen },
      users: { entity: 'users', table: localDb.users },
      payments: { entity: 'payments', table: localDb.payments },
      payment_modes: { entity: 'payments', table: localDb.paymentModes },
      product_addons: { entity: 'product_addons', table: localDb.productAddons },
    };

    for (const [tableName, ids] of grouped) {
      const def = tableMap[tableName];
      if (!def) continue;
      let deleted = 0;
      for (const id of ids) {
        // Cloud products ALWAYS overwrite local — never skip a product tombstone
        // (cloud is the only truth for products.stock).
        if (def.entity !== 'products' && await hasPendingOpsFor(def.entity, id)) continue;
        const exists = await def.table.get(id);
        if (exists) {
          await def.table.delete(id);
          deleted++;
        }
      }
      if (deleted > 0) {
        changed.push(def.entity);
        console.log(`[CloudPull] Tombstone cleanup: deleted ${deleted} ${def.entity} locally`);
      }
    }
  } catch (err) {
    console.warn('[CloudPull] Tombstone cleanup failed:', err);
  }
  return changed;
}

async function pullEntity(def: PullDef, since: Date, forceFull: boolean): Promise<boolean> {
  try {
    const effectiveSince = forceFull ? new Date(0) : since;
    const rows = await def.fetch(effectiveSince.getTime() > 0 ? effectiveSince : undefined);
    if (!rows || rows.length === 0) return false;

    const pending = await localDb.pendingOps.where('entity').equals(def.entity).toArray();
    const pendingIds = new Set(pending.filter((op: any) => op.opType !== 'delete').map((op: any) => op.entityId));

    let changed = 0;
    for (const row of rows) {
      // Cloud products ALWAYS overwrite local (cloud is the only truth for
      // products.stock). Pending local product edits self-heal via SyncEngine
      // re-push, so we never skip a cloud product row.
      if (def.entity !== 'products' && row && row.id && pendingIds.has(row.id)) continue;
      changed++;
    }

    const writable = rows.filter((r: any) => r && r.id && (def.entity === 'products' || !pendingIds.has(r.id)));
    if (writable.length > 0) {
      await def.write(writable);
    }
    return changed > 0;
  } catch (err) {
    console.warn(`[CloudPull] ${def.entity} pull failed:`, err);
    return false;
  }
}

async function checkUserStatus(): Promise<void> {
  try {
    const cached = localStorage.getItem('pos_offline_profile');
    if (!cached) return;
    const profile = JSON.parse(cached);
    if (!profile?.id) return;

    const { data } = await supabase.from('users').select('id, active, role').eq('id', profile.id).maybeSingle();
    if (!data) return;
    if (data.active === false) {
      console.warn('[CloudPull] Current user deactivated on another device — forcing logout.');
      window.dispatchEvent(new Event('user-blocked'));
    }
  } catch (err) {}
}

export async function pullCloudChanges(forceFull = false): Promise<PullEntity[]> {
  if (!_sessionActive) return [];
  if (!navigator.onLine) return [];
  if (_pullRunning) {
    const deadline = Date.now() + 8000;
    while (_pullRunning && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (_pullRunning) return [];
  }

  _pullRunning = true;
  const changed: PullEntity[] = [];
  try {
    const since = getLastPullTime();

    const tombSince = forceFull ? new Date(0) : since;
    const tombChanged = await applyTombstones(tombSince);
    changed.push(...tombChanged);

    const results = await Promise.all(
      PULL_DEFS.map(async (def) => {
        const didChange = await pullEntity(def, since, forceFull);
        return { entity: def.entity, didChange };
      })
    );

    for (const r of results) {
      if (r.didChange && !changed.includes(r.entity)) changed.push(r.entity);
    }

    try {
      const all = await localDb.sales.toArray();
      const stale = all.filter((s: any) => s.status === 'deleted');
      for (const s of stale) await localDb.sales.delete(s.id);
      if (stale.length) console.log(`[CloudPull] Purged ${stale.length} locally-soft-deleted sales.`);
    } catch (e) {}

    if (!forceFull) {
      await checkUserStatus();
    }

    if (forceFull) {
      setLastPullTime();
      console.log('[CloudPull] Full pull complete. Entities changed:', changed.join(', ') || 'none');
    } else if (changed.length > 0) {
      setLastPullTime();
    }

    if (changed.length > 0) {
      window.dispatchEvent(new CustomEvent('cloud-pull-changed', { detail: { entities: changed } }));
      _onChanged?.(changed);
    }
  } catch (err) {
    console.warn('[CloudPull] Pull cycle failed:', err);
  } finally {
    _pullRunning = false;
  }
  return changed;
}

export function startCloudPull(onChanged?: (entities: PullEntity[]) => void) {
  _sessionActive = true;
  _onChanged = onChanged || null;

  window.addEventListener('online', handleNetworkEvent);
  document.addEventListener('visibilitychange', handleVisibility);

  pullCloudChanges(false).catch(() => { });

  console.log(`[CloudPull] Engine started.`);
}

function handleNetworkEvent() {
  if (_sessionActive && navigator.onLine) {
    console.log('[CloudPull] Online event — pulling latest cloud data.');
    pullCloudChanges(false).catch(() => { });
  }
}

function handleVisibility() {
  if (_sessionActive && !document.hidden && navigator.onLine) {
    pullCloudChanges(false).catch(() => { });
  }
}

export function stopCloudPull() {
  _sessionActive = false;
  _onChanged = null;
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  window.removeEventListener('online', handleNetworkEvent);
  document.removeEventListener('visibilitychange', handleVisibility);
  if (_channel) {
    supabase.removeChannel(_channel).catch(() => { });
    _channel = null;
  }
  console.log('[CloudPull] Engine stopped.');
}
