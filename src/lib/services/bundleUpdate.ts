import {
  localDb,
  queueOp,
  generateId,
} from '../localDb';
import {
  ExtraTopping,
} from '../../types';

/** Update bundle (replaces all items and slots) (offline-first) */
export async function updateBundle(bundleId: string, data: {
  name?: string;
  description?: string;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed';
  hideItemPrices?: boolean;
  active?: boolean;
  items?: { productId: string; quantity: number }[];
  slots?: { name: string; requiredQuantity: number; orderIndex: number; options: { productId: string; sortOrder?: number }[] }[];
  isCombo?: boolean;
  image?: string;
  highlightTag?: 'sunday' | 'crown';
  badgeEnabled?: boolean;
  badgeText?: string;
  badgeIcon?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  scheduleType?: 'always' | 'scheduled';
  startDate?: string;
  endDate?: string;
  repeatDays?: string[];
  startTime?: string;
  endTime?: string;
  extraToppings?: ExtraTopping[];
}): Promise<void> {
  const now = new Date().toISOString();
  const updates: any = { updated_at: now };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.description !== undefined) updates.description = data.description;
  if (data.discountValue !== undefined) updates.discount_value = data.discountValue;
  if (data.discountType !== undefined) updates.discount_type = data.discountType;
  if (data.hideItemPrices !== undefined) updates.hide_item_prices = data.hideItemPrices;
  if (data.isCombo !== undefined) updates.is_combo = data.isCombo;
  if (data.active !== undefined) updates.active = data.active;
  if (data.image !== undefined) updates.image = data.image;
  if (data.highlightTag !== undefined) updates.highlight_tag = data.highlightTag;
  if (data.badgeEnabled !== undefined) updates.badge_enabled = data.badgeEnabled;
  if (data.badgeText !== undefined) updates.badge_text = data.badgeText;
  if (data.badgeIcon !== undefined) updates.badge_icon = data.badgeIcon;
  if (data.badgeBgColor !== undefined) updates.badge_bg_color = data.badgeBgColor;
  if (data.badgeTextColor !== undefined) updates.badge_text_color = data.badgeTextColor;
  if (data.dealCategory !== undefined) updates.deal_category = data.dealCategory;
  if (data.overridePrice !== undefined) updates.override_price = data.overridePrice;
  if (data.scheduleType !== undefined) updates.schedule_type = data.scheduleType;
  if (data.startDate !== undefined) updates.start_date = data.startDate || null;
  if (data.endDate !== undefined) updates.end_date = data.endDate || null;
  if (data.repeatDays !== undefined) updates.repeat_days = data.repeatDays || null;
  if (data.startTime !== undefined) updates.start_time = data.startTime || null;
  if (data.endTime !== undefined) updates.end_time = data.endTime || null;
  if (data.extraToppings !== undefined) updates.extra_toppings = data.extraToppings;

  // Update local FIRST (offline-first)
  const localUpdates: any = { updatedAt: new Date(now) };
  if (data.name !== undefined) localUpdates.name = data.name.trim();
  if (data.description !== undefined) localUpdates.description = data.description;
  if (data.discountValue !== undefined) localUpdates.discountValue = data.discountValue;
  if (data.discountType !== undefined) localUpdates.discountType = data.discountType;
  if (data.hideItemPrices !== undefined) localUpdates.hideItemPrices = data.hideItemPrices;
  if (data.isCombo !== undefined) localUpdates.isCombo = data.isCombo;
  if (data.active !== undefined) localUpdates.active = data.active;
  if (data.image !== undefined) localUpdates.image = data.image;
  if (data.highlightTag !== undefined) localUpdates.highlightTag = data.highlightTag;
  if (data.badgeEnabled !== undefined) localUpdates.badgeEnabled = data.badgeEnabled;
  if (data.badgeText !== undefined) localUpdates.badgeText = data.badgeText;
  if (data.badgeIcon !== undefined) localUpdates.badgeIcon = data.badgeIcon;
  if (data.badgeBgColor !== undefined) localUpdates.badgeBgColor = data.badgeBgColor;
  if (data.badgeTextColor !== undefined) localUpdates.badgeTextColor = data.badgeTextColor;
  if (data.dealCategory !== undefined) localUpdates.dealCategory = data.dealCategory;
  if (data.overridePrice !== undefined) localUpdates.overridePrice = data.overridePrice;
  if (data.scheduleType !== undefined) localUpdates.scheduleType = data.scheduleType;
  if (data.startDate !== undefined) localUpdates.startDate = data.startDate || null;
  if (data.endDate !== undefined) localUpdates.endDate = data.endDate || null;
  if (data.repeatDays !== undefined) localUpdates.repeatDays = data.repeatDays || null;
  if (data.startTime !== undefined) localUpdates.startTime = data.startTime || null;
  if (data.endTime !== undefined) localUpdates.endTime = data.endTime || null;
  if (data.extraToppings !== undefined) localUpdates.extraToppings = data.extraToppings;

  await localDb.bundles.where('id').equals(bundleId).modify(localUpdates);

  const oldItemIds: string[] = [];
  const oldSlotIds: string[] = [];
  const oldOptionIds: string[] = [];

  // Replace items locally
  const itemRows = data.items ? data.items.map(item => ({
    id: generateId(),
    bundleId: bundleId,
    productId: item.productId,
    quantity: item.quantity,
  })) : undefined;

  if (itemRows !== undefined) {
    oldItemIds.push(...(await localDb.bundleItems.where('bundleId').equals(bundleId).toArray()).map(r => r.id));
    await localDb.bundleItems.where('bundleId').equals(bundleId).delete();
    if (itemRows.length > 0) await localDb.bundleItems.bulkPut(itemRows);
  }

  // Replace slots locally
  let slotRows: any[] | undefined = undefined;
  let optionRows: any[] | undefined = undefined;
  if (data.slots !== undefined) {
    slotRows = [];
    optionRows = [];
    data.slots.forEach(slot => {
      const slotId = generateId();
      slotRows!.push({
        id: slotId,
        bundleId: bundleId,
        name: slot.name,
        requiredQuantity: slot.requiredQuantity,
        orderIndex: slot.orderIndex,
      });
      slot.options.forEach((opt, optIdx) => {
        optionRows!.push({
          id: generateId(),
          slotId: slotId,
          productId: opt.productId,
          sortOrder: opt.sortOrder ?? optIdx,
        });
      });
    });

    const oldSlots = await localDb.bundleSlots.where('bundleId').equals(bundleId).toArray();
    for (const oldSlot of oldSlots) {
      oldSlotIds.push(oldSlot.id);
      const opts = await localDb.bundleSlotOptions.where('slotId').equals(oldSlot.id).toArray();
      oldOptionIds.push(...opts.map(o => o.id));
      await localDb.bundleSlotOptions.where('slotId').equals(oldSlot.id).delete();
    }
    await localDb.bundleSlots.where('bundleId').equals(bundleId).delete();

    if (slotRows.length > 0) {
      await localDb.bundleSlots.bulkPut(slotRows);
      await localDb.bundleSlotOptions.bulkPut(optionRows);
    }
  }

  // OFFLINE-FIRST: queue parent update + child deletes (by specific old id) + inserts.
  // Deleting specific old ids then inserting new ids is queue-safe (no overlap, order-independent).
  if (Object.keys(updates).length > 1) {
    await queueOp('bundles', 'update', bundleId, updates);
  }
  if (itemRows !== undefined) {
    for (const oldId of oldItemIds) await queueOp('bundle_items', 'delete', oldId, {});
    for (const item of itemRows) {
      await queueOp('bundle_items', 'create', item.id, { id: item.id, bundle_id: bundleId, product_id: item.productId, quantity: item.quantity, created_at: now });
    }
  }
  if (slotRows !== undefined && optionRows !== undefined) {
    for (const oldId of oldSlotIds) await queueOp('bundle_slots', 'delete', oldId, {});
    for (const oldId of oldOptionIds) await queueOp('bundle_slot_options', 'delete', oldId, {});
    for (const slot of slotRows) {
      await queueOp('bundle_slots', 'create', slot.id, { id: slot.id, bundle_id: bundleId, name: slot.name, required_quantity: slot.requiredQuantity, order_index: slot.orderIndex, created_at: now });
    }
    for (const opt of optionRows) {
      await queueOp('bundle_slot_options', 'create', opt.id, { id: opt.id, slot_id: opt.slotId, product_id: opt.productId, sort_order: opt.sortOrder ?? 0, created_at: now });
    }
  }
}
