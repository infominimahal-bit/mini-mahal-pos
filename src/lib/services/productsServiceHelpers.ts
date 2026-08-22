import {
  Product,
} from '../../types';

/**
 * Builds a child (variation) Product object from a parent product and a
 * variant definition. Pure helper — extracted verbatim from productsService
 * (used for both create and update of variable products) to avoid duplication.
 */
export function buildChildProduct(
  parent: Product,
  vd: any,
  childId: string,
  childName: string
): Product {
  return {
    ...parent,
    id: childId,
    name: childName,
    sku: vd.barcode || `${parent.sku}-${childId.substring(0, 4)}`,
    barcode: vd.barcode || undefined,
    barcodeValue: vd.barcode || undefined,
    productType: 'variation',
    parentId: parent.id,
    price: vd.priceOverride ?? parent.price,
    cost: vd.cost ?? parent.cost,
    stock: vd.stock ?? 0,
    variants: [],
    variantData: [],
    modifiers: [],
    productAddons: [],
    trackInventory: true
  };
}
