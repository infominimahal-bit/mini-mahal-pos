import {
  localDb,
  queueOp,
  generateId,
} from '../localDb';
import {
  Bundle,
  ExtraTopping,
} from '../../types';

/** Create a new bundle with its items (offline-first) */
export async function createBundle(data: {
  name: string;
  description?: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  items?: { productId: string; quantity: number }[];
  slots?: { name: string; requiredQuantity: number; orderIndex: number; options: { productId: string; sortOrder?: number }[] }[];
  hideItemPrices?: boolean;
  isCombo?: boolean;
  dealCategory?: 'pizza' | 'burger' | 'beverage' | 'single_item';
  overridePrice?: number;
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
}): Promise<Bundle> {
  const id = generateId();
  const now = new Date().toISOString();

  const itemRows = (data.items || []).map(item => ({
    id: generateId(),
    bundle_id: id,
    product_id: item.productId,
    quantity: item.quantity,
    created_at: now,
  }));

  const slotRows: any[] = [];
  const optionRows: any[] = [];

  if (data.slots) {
    data.slots.forEach(slot => {
      const slotId = generateId();
      slotRows.push({
        id: slotId,
        bundle_id: id,
        name: slot.name,
        required_quantity: slot.requiredQuantity,
        order_index: slot.orderIndex,
        created_at: now,
      });
      slot.options.forEach((opt, optIdx) => {
        optionRows.push({
          id: generateId(),
          slot_id: slotId,
          product_id: opt.productId,
          sort_order: opt.sortOrder ?? optIdx,
          created_at: now,
        });
      });
    });
  }

  // 1. Persist locally FIRST (offline-first)
  const bundleLocal = {
    id,
    name: data.name.trim(),
    description: data.description || '',
    discountValue: data.discountValue,
    discountType: data.discountType,
    scheduleType: data.scheduleType || 'always',
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    repeatDays: data.repeatDays || null,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    hideItemPrices: data.hideItemPrices || false,
    isCombo: data.isCombo || false,
    extraToppings: data.extraToppings || [],
    badgeEnabled: data.badgeEnabled || false,
    badgeText: data.badgeText || undefined,
    badgeIcon: data.badgeIcon || undefined,
    badgeBgColor: data.badgeBgColor || undefined,
    badgeTextColor: data.badgeTextColor || undefined,
    active: true,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
  await localDb.bundles.put(bundleLocal);

  if (itemRows.length > 0) {
    await localDb.bundleItems.bulkPut(itemRows.map(r => ({
      id: r.id,
      bundleId: id,
      productId: r.product_id,
      quantity: r.quantity,
    })));
  }

  if (slotRows.length > 0) {
    await localDb.bundleSlots.bulkPut(slotRows.map(r => ({
      id: r.id,
      bundleId: id,
      name: r.name,
      requiredQuantity: r.required_quantity,
      orderIndex: r.order_index,
    })));
    await localDb.bundleSlotOptions.bulkPut(optionRows.map(r => ({
      id: r.id,
      slotId: r.slot_id,
      productId: r.product_id,
      sortOrder: r.sort_order ?? 0,
    })));
  }

  // OFFLINE-FIRST: queue all bundle writes; SyncEngine replicates to cloud (never direct supabase write).
  const bundleRemote = {
    id,
    name: data.name.trim(),
    description: data.description || '',
    discount_value: data.discountValue,
    discount_type: data.discountType,
    schedule_type: data.scheduleType || 'always',
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    repeat_days: data.repeatDays || null,
    start_time: data.startTime || null,
    end_time: data.endTime || null,
    hide_item_prices: data.hideItemPrices || false,
    is_combo: data.isCombo || false,
    deal_category: data.dealCategory || 'pizza',
    override_price: data.overridePrice || null,
    badge_enabled: data.badgeEnabled || false,
    badge_text: data.badgeText || null,
    badge_icon: data.badgeIcon || null,
    badge_bg_color: data.badgeBgColor || null,
    badge_text_color: data.badgeTextColor || null,
    extra_toppings: data.extraToppings || [],
    active: true,
    created_at: now,
    updated_at: now,
  };
  await queueOp('bundles', 'create', id, bundleRemote);
  for (const r of itemRows) {
    await queueOp('bundle_items', 'create', r.id, { id: r.id, bundle_id: r.bundleId, product_id: r.productId, quantity: r.quantity, created_at: now });
  }
  for (const r of slotRows) {
    await queueOp('bundle_slots', 'create', r.id, { id: r.id, bundle_id: r.bundleId, name: r.name, required_quantity: r.requiredQuantity, order_index: r.orderIndex, created_at: now });
  }
  for (const r of optionRows) {
    await queueOp('bundle_slot_options', 'create', r.id, { id: r.id, slot_id: r.slotId, product_id: r.productId, sort_order: r.sortOrder ?? 0, created_at: now });
  }

  return {
    ...bundleLocal,
    items: itemRows.map(r => ({ id: r.id, bundleId: id, productId: r.product_id, quantity: r.quantity })),
    slots: slotRows.map(r => ({
      id: r.id, bundleId: id, name: r.name, requiredQuantity: r.required_quantity, orderIndex: r.order_index,
      options: optionRows.filter(o => o.slot_id === r.id).map(o => ({ id: o.id, slotId: r.id, productId: o.product_id, sortOrder: o.sort_order ?? 0 }))
    })),
  };
}
