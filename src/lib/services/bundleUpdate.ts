import {
  localDb,
  generateId,
} from '../localDb';
import { cloudWrite } from '../cloudWrite';

/** Update bundle (replaces all items) (cloud-direct: cloud is the single source of truth) */
export async function updateBundle(bundleId: string, data: {
  name?: string;
  description?: string;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed';
  hideItemPrices?: boolean;
  active?: boolean;
  items?: { productId: string; quantity: number }[];
  overridePrice?: number;
  image?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const updates: any = { updated_at: now };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.description !== undefined) updates.description = data.description;
  if (data.discountValue !== undefined) updates.discount_value = data.discountValue;
  if (data.discountType !== undefined) updates.discount_type = data.discountType;
  if (data.hideItemPrices !== undefined) updates.hide_item_prices = data.hideItemPrices;
  if (data.active !== undefined) updates.active = data.active;
  if (data.image !== undefined) updates.image = data.image;
  if (data.overridePrice !== undefined) updates.override_price = data.overridePrice;

  const localUpdates: any = { updatedAt: new Date(now) };
  if (data.name !== undefined) localUpdates.name = data.name.trim();
  if (data.description !== undefined) localUpdates.description = data.description;
  if (data.discountValue !== undefined) localUpdates.discountValue = data.discountValue;
  if (data.discountType !== undefined) localUpdates.discountType = data.discountType;
  if (data.hideItemPrices !== undefined) localUpdates.hideItemPrices = data.hideItemPrices;
  if (data.active !== undefined) localUpdates.active = data.active;
  if (data.image !== undefined) localUpdates.image = data.image;
  if (data.overridePrice !== undefined) localUpdates.overridePrice = data.overridePrice;

  // Replace items: build new rows and capture the current item ids BEFORE any mutation.
  const itemRows = data.items ? data.items.map(item => ({
    id: generateId(),
    bundleId: bundleId,
    productId: item.productId,
    quantity: item.quantity,
  })) : undefined;

  const oldItemIds: string[] = itemRows !== undefined
    ? (await localDb.bundleItems.where('bundleId').equals(bundleId).toArray()).map(r => r.id)
    : [];

  // 1. Cloud FIRST — parent update, then replace children (delete old ids, insert new).
  // Deleting specific old ids then inserting new ids has no overlap and is order-independent.
  if (Object.keys(updates).length > 1) {
    await cloudWrite('bundles', 'update', bundleId, { ...updates, id: bundleId });
  }
  if (itemRows !== undefined) {
    for (const oldId of oldItemIds) await cloudWrite('bundle_items', 'delete', oldId, {});
    for (const item of itemRows) {
      await cloudWrite('bundle_items', 'create', item.id, { id: item.id, bundle_id: bundleId, product_id: item.productId, quantity: item.quantity, created_at: now });
    }
  }

  // 2. Local cache.
  await localDb.bundles.where('id').equals(bundleId).modify(localUpdates);
  if (itemRows !== undefined) {
    await localDb.bundleItems.where('bundleId').equals(bundleId).delete();
    if (itemRows.length > 0) await localDb.bundleItems.bulkPut(itemRows);
  }
}
