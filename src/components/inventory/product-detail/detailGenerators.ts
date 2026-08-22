import { generateBarcodeValue } from '../../../utils/barcode';
import { sonner } from '../../../lib/sonner';
import { DetailCtx } from './detailContext';

export function generateBarcode(ctx: DetailCtx) {
  if (!ctx.formData.name.trim()) {
    sonner.error('Please enter a product name first to generate a barcode');
    return;
  }
  const barcode = generateBarcodeValue(ctx.formData.name);
  ctx.setFormData(prev => ({ ...prev, barcode }));
}

export function generateSku(ctx: DetailCtx) {
  if (!ctx.formData.name.trim()) {
    sonner.error('Please enter a product name first to generate a smart SKU');
    return;
  }

  const words = ctx.formData.name.trim().split(/\s+/);
  let prefix = '';

  if (words.length >= 2) {
    prefix = (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase();
  } else if (words[0].length >= 3) {
    prefix = words[0].substring(0, 3).toUpperCase();
  } else {
    prefix = words[0].toUpperCase() + 'X';
  }

  const randomDigits = Math.floor(100 + Math.random() * 900).toString();
  const sku = prefix + '-' + randomDigits;

  ctx.setFormData(prev => ({ ...prev, sku }));
}
