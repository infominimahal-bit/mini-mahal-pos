import { Product } from '../../../types';
import { normalizeBarcodeValue } from '../../../utils/barcode';

export function filterProducts(appProducts: any[], searchTerm: string, selectedCategory: string): Product[] {
  return (appProducts ?? []).filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
      (product.barcodeValue && product.barcodeValue.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
      (product.barcode && product.barcode.toLowerCase().includes((searchTerm || '').toLowerCase()));

    const matchesCategory = (searchTerm || '').trim() !== ''
      ? true
      : (selectedCategory === 'All' || (selectedCategory === 'Featured' ? product.isFeatured : (selectedCategory === 'Pizzas' ? (product.category === 'Pizzas' || product.category === 'Special Pizzas') : product.category === selectedCategory)));

    return matchesSearch && matchesCategory && product.active !== false && product.productType !== 'variation';
  }).sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function findProductByBarcode(appProducts: any[], term: string, caseSensitiveExact = false): Product | undefined {
  const normalizedTerm = normalizeBarcodeValue(term);

  return appProducts.find((p: Product) => {
    const pBarcode = normalizeBarcodeValue(p.barcode);
    const pSku = normalizeBarcodeValue(p.sku);
    const pBarcodeVal = normalizeBarcodeValue(p.barcodeValue);

    const exactMatch = caseSensitiveExact
      ? (p.barcodeValue === term || p.barcode === term || p.sku === term)
      : (p.barcodeValue && p.barcodeValue.toLowerCase() === term.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase() === term.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === term.toLowerCase());

    if (exactMatch) return true;
    return pBarcodeVal === normalizedTerm || pBarcode === normalizedTerm || pSku === normalizedTerm;
  });
}
