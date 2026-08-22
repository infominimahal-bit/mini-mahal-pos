import {
  localDb,
  generateId,
} from '../localDb';
import { cloudWrite } from '../cloudWrite';
import {
  Bundle,
} from '../../types';

/** Create a new bundle with its items (cloud-direct: cloud is the single source of truth) */
export async function createBundle(data: {
  name: string;
  description?: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  items?: { productId: string; quantity: number }[];
  hideItemPrices?: boolean;
  overridePrice?: number;
  image?: string | null;
}): Promise<Bundle> {
  const id = generateId();
  const now = new Date().toISOString();

  const itemRows = (data.items || []).map(item => ({
    id: generateId(),
    bundleId: id,
    productId: item.productId,
    quantity: item.quantity,
  }));

  // 1. Cloud FIRST — bundle row must exist before its item rows (FK), and before any
  // local write so a failed create can never leave a local-only ghost.
  const bundleRemote = {
    id,
    name: data.name.trim(),
    description: data.description || '',
    discount_value: data.discountValue,
    discount_type: data.discountType,
    hide_item_prices: data.hideItemPrices || false,
    override_price: data.overridePrice || null,
    image: data.image || null,
    active: true,
    created_at: now,
    updated_at: now,
  };
  await cloudWrite('bundles', 'create', id, bundleRemote);
  for (const r of itemRows) {
    await cloudWrite('bundle_items', 'create', r.id, { id: r.id, bundle_id: id, product_id: r.productId, quantity: r.quantity, created_at: now });
  }

  // 2. Local cache.
  const bundleLocal = {
    id,
    name: data.name.trim(),
    description: data.description || '',
    discountValue: data.discountValue,
    discountType: data.discountType,
    hideItemPrices: data.hideItemPrices || false,
    overridePrice: data.overridePrice ?? undefined,
    image: data.image || undefined,
    active: true,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
  await localDb.bundles.put(bundleLocal);

  if (itemRows.length > 0) {
    await localDb.bundleItems.bulkPut(itemRows.map(r => ({
      id: r.id,
      bundleId: id,
      productId: r.productId,
      quantity: r.quantity,
    })));
  }

  return {
    ...bundleLocal,
    items: itemRows.map(r => ({ id: r.id, bundleId: id, productId: r.productId, quantity: r.quantity })),
  };
}
