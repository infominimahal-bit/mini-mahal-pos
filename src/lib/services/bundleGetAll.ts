import { supabase } from '../supabase';
import {
  localDb,
} from '../localDb';
import { mapBundle } from './bundleMappers';
import {
  Bundle,
  BundleItem,
} from '../../types';

/** Fetch all active bundles with their items */
export async function getAllBundles(forceRemote: boolean = false): Promise<Bundle[]> {
  // Try local first if not forcing remote
  if (!forceRemote) {
    try {
      const local = await localDb.bundles.toArray();
      if (local.length > 0) {
        const localItems = await localDb.bundleItems.toArray();
        const localSlots = await localDb.bundleSlots.toArray();
        const localSlotOptions = await localDb.bundleSlotOptions.toArray();

        return local.map((b: any): Bundle => {
          const bundleSlots = localSlots
            .filter((s: any) => s.bundleId === b.id)
            .map((s: any) => ({
              ...s,
              options: localSlotOptions
                .filter((opt: any) => opt.slotId === s.id)
                .map((opt: any) => ({
                  id: opt.id,
                  slotId: opt.slotId,
                  productId: opt.productId,
                  sortOrder: opt.sortOrder ?? 0,
                }))
                .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            }));

          return {
            id: b.id,
            name: b.name || '',
            description: b.description || '',
            discountValue: Number(b.discountValue) || 0,
            discountType: b.discountType || 'percentage',
            active: b.active !== false,
            hideItemPrices: b.hideItemPrices === true,
            image: b.image,
            isCombo: b.isCombo === true || b.is_combo === true,
            items: localItems.filter((bi: any) => bi.bundleId === b.id).map((bi: any): BundleItem => ({
              id: bi.id,
              bundleId: bi.bundleId,
              productId: bi.productId,
              quantity: Number(bi.quantity) || 1,
            })),
            slots: bundleSlots,
            createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
            updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
          };
        });
      }
    } catch (e) {
      console.warn('[bundlesService.getAll] Local fetch failed, trying cloud', e);
    }
  }

  // Cloud fetch
  const { data, error } = await supabase
    .from('bundles')
    .select('*, bundle_items(*), bundle_slots(*, bundle_slot_options(*))')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const bundles = (data || []).map(mapBundle);

  // Hydrate local db - clear first to handle deletions from other devices
  try {
    await localDb.transaction('rw', localDb.bundles, localDb.bundleItems, localDb.bundleSlots, localDb.bundleSlotOptions, async () => {
      await localDb.bundles.clear();
      await localDb.bundleItems.clear();
      await localDb.bundleSlots.clear();
      await localDb.bundleSlotOptions.clear();

      if (bundles.length > 0) {
        await localDb.bundles.bulkPut(bundles.map((b: Bundle) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          discountValue: b.discountValue,
          discountType: b.discountType,
          active: b.active,
          hideItemPrices: b.hideItemPrices || false,
          isCombo: b.isCombo || false,
          image: b.image,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        })));

        const allItems = bundles.reduce((acc: any[], b: Bundle) => {
          if (b.items && b.items.length > 0) {
            acc.push(...b.items.map((bi: BundleItem) => ({
              id: bi.id,
              bundleId: bi.bundleId,
              productId: bi.productId,
              quantity: bi.quantity,
            })));
          }
          return acc;
        }, []);

        const allSlots = bundles.reduce((acc: any[], b: Bundle) => {
          if (b.slots && b.slots.length > 0) {
            acc.push(...b.slots.map((s: any) => ({
              id: s.id,
              bundleId: s.bundleId,
              name: s.name,
              requiredQuantity: s.requiredQuantity,
              orderIndex: s.orderIndex,
            })));
          }
          return acc;
        }, []);

        const allSlotOptions = bundles.reduce((acc: any[], b: Bundle) => {
          if (b.slots && b.slots.length > 0) {
            b.slots.forEach(s => {
              if (s.options && s.options.length > 0) {
                acc.push(...s.options.map((opt: any) => ({
                  id: opt.id,
                  slotId: opt.slotId,
                  productId: opt.productId,
                  sortOrder: opt.sortOrder ?? 0,
                })));
              }
            });
          }
          return acc;
        }, []);

        if (allItems.length > 0) await localDb.bundleItems.bulkPut(allItems);
        if (allSlots.length > 0) await localDb.bundleSlots.bulkPut(allSlots);
        if (allSlotOptions.length > 0) await localDb.bundleSlotOptions.bulkPut(allSlotOptions);

      }
    });
  } catch (e) {
    console.warn('[bundlesService.getAll] Failed to update local cache:', e);
  }

  return bundles;
}
