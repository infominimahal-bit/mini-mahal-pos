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

        return local.map((b: any): Bundle => {
          return {
            id: b.id,
            name: b.name || '',
            description: b.description || '',
            discountValue: Number(b.discountValue) || 0,
            discountType: b.discountType || 'percentage',
            active: b.active !== false,
            hideItemPrices: b.hideItemPrices === true,
            overridePrice: b.overridePrice ?? undefined,
            image: b.image,
            items: localItems.filter((bi: any) => bi.bundleId === b.id).map((bi: any): BundleItem => ({
              id: bi.id,
              bundleId: bi.bundleId,
              productId: bi.productId,
              quantity: Number(bi.quantity) || 1,
            })),
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
    .select('*, bundle_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const bundles = (data || []).map(mapBundle);

  // Hydrate local db - clear first to handle deletions from other devices
  try {
    await localDb.transaction('rw', localDb.bundles, localDb.bundleItems, async () => {
      await localDb.bundles.clear();
      await localDb.bundleItems.clear();

      if (bundles.length > 0) {
        await localDb.bundles.bulkPut(bundles.map((b: Bundle) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          discountValue: b.discountValue,
          discountType: b.discountType,
          active: b.active,
          hideItemPrices: b.hideItemPrices || false,
          overridePrice: b.overridePrice ?? undefined,
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

        if (allItems.length > 0) await localDb.bundleItems.bulkPut(allItems);
      }
    });
  } catch (e) {
    console.warn('[bundlesService.getAll] Failed to update local cache:', e);
  }

  return bundles;
}
