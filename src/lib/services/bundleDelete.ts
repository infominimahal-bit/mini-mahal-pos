import {
  localDb,
  queueOp,
} from '../localDb';

/** Delete bundle and all its items (offline-first) */
export async function deleteBundle(bundleId: string): Promise<void> {
  // Optimistic local delete
  await localDb.bundleItems.where('bundleId').equals(bundleId).delete();
  const oldSlots = await localDb.bundleSlots.where('bundleId').equals(bundleId).toArray();
  for (const oldSlot of oldSlots) {
    await localDb.bundleSlotOptions.where('slotId').equals(oldSlot.id).delete();
  }
  await localDb.bundleSlots.where('bundleId').equals(bundleId).delete();
  await localDb.bundles.delete(bundleId);

  // OFFLINE-FIRST: queue the delete; SyncEngine replicates to cloud (never direct supabase write).
  await queueOp('bundles', 'delete', bundleId, {});
}
