import {
  localDb,
} from '../localDb';
import { cloudWrite } from '../cloudWrite';

/** Delete bundle and all its items (cloud-direct: cloud is the single source of truth) */
export async function deleteBundle(bundleId: string): Promise<void> {
  // Cloud FIRST — cloud FK cascade removes bundle_items. Throw on failure keeps the
  // local cache intact (no divergence).
  await cloudWrite('bundles', 'delete', bundleId, {});

  // Local cache cleanup.
  await localDb.bundleItems.where('bundleId').equals(bundleId).delete();
  await localDb.bundles.delete(bundleId);
}
