import html2canvas from 'html2canvas';
import { formatCurrency } from '../../../lib/currencies';
import { formatAppDate } from '../../../lib/dateUtils';
import { sonner } from '../../../lib/sonner';

export function buildPrintHtml(
  innerHTML: string,
  opts: {
    is58mm: boolean;
    isA4: boolean;
    pageSizeCSS: string;
    fontFamily: string;
    settings: any;
  }
): string {
  const { is58mm, isA4, pageSizeCSS, fontFamily, settings } = opts;
  const thermalWidth = is58mm ? '48mm' : '72mm';
  const finalWidth = isA4 ? '100%' : thermalWidth;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff !important; width: 100%; }
  @page { margin: 0 !important; size: ${pageSizeCSS}; }
  #print-container {
    width: ${finalWidth} !important;
    max-width: ${finalWidth} !important;
    margin: 0 !important;
    padding: 0 !important;
    position: relative !important;
    left: ${settings.receiptOffsetX || 0}mm !important;
    background: #fff !important;
    color: #000 !important;
    display: block !important;
    word-wrap: break-word;
    font-family: ${fontFamily};
  }
  .header-segment {
    text-align: center !important;
    position: relative !important;
    left: ${settings.receiptHeaderOffsetX || 0}mm !important;
    width: 100% !important;
    display: block !important;
  }
  .footer-segment {
    text-align: center !important;
    position: relative !important;
    left: ${settings.receiptFooterOffsetX || 0}mm !important;
    width: 100% !important;
    display: block !important;
  }
  .body-segment {
    width: 100% !important;
    display: block !important;
  }
  * { background: transparent !important; color: #000 !important; box-shadow: none !important; }
</style>
</head>
<body>
  <div id="print-container">
    ${innerHTML}
  </div>
</body>
</html>`;
}

export async function captureReceiptCanvas(receiptEl: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(receiptEl, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    width: receiptEl.offsetWidth,
    height: receiptEl.scrollHeight,
    windowHeight: receiptEl.scrollHeight,
    y: 0, scrollX: 0, scrollY: 0
  });
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  sonner.success('Receipt saved to downloads');
}

export function openWhatsAppReceipt(sale: any, settings: any, currencyCode: string, showDiscount: boolean) {
  if (!sale.customerPhone) return;
  const cleanPhone = sale.customerPhone.replace(/\D/g, '');
  const itemsList = sale.items
    .map((item: any, idx: number) => `${idx + 1}. ${item.product.name} (x${item.quantity}): ${formatCurrency(item.product.price, currencyCode)}`)
    .join('\n');

  let message = `*${settings.storeName} - Digital Receipt*\n\n` +
    `Hello ${sale.customerName || 'Customer'},\n` +
    `Thank you for your purchase! Here is your invoice details:\n\n` +
    `*Invoice:* ${sale.invoiceNumber}\n` +
    `*Date:* ${formatAppDate(sale.timestamp, settings.country)}\n\n` +
    `*Items:*\n${itemsList}\n\n`;

  if (showDiscount) {
    message += `*Subtotal: ${formatCurrency(sale.subtotal, currencyCode)}*\n`;
    if (sale.discountAmount > 0) {
      message += `*Discount: -${formatCurrency(sale.discountAmount, currencyCode)}*\n`;
    }
  }
  if (sale.taxAmount > 0) {
    message += `*Tax: ${formatCurrency(sale.taxAmount, currencyCode)}*\n`;
  }

  message += `\n*Total: ${formatCurrency(sale.total, currencyCode)}*\n\n` +
    `_Software by Zaynah Developers_`;
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
}
