import React from 'react';
import { formatCurrency } from '../../lib/currencies';
import { BarcodePreview } from '../../shared/ui/BarcodePreview';
import { RenderReceiptLayoutProps } from './ReceiptPreviewLayoutProps';

export function renderHorizontalHeader(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, fs, RECEIPT_WATERMARK, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, footerBlock, storeNameBlock, storeInfoBlock, renderLogo, total, is58mm, previewWrap, TwoCol, itemRows } = props;
  return previewWrap(
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '10px' }}>
        {renderLogo({ width: '50px', height: '50px', border: '2px solid #000', borderRadius: '8px', flexShrink: 0 })}
        <div style={{ textAlign: 'left' }}>
          {settings.receiptShowStoreName && storeNameBlock}
          {storeInfoBlock}
        </div>
      </div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {defaultItemsTable}
        <div style={{ borderTop: '2px solid #000', width: '100%', margin: '8px 0' }} />
        {totalsBlock}
        <TwoCol left="TOTAL" right={formatCurrency(total, settings.currency)} bold lg style={{ padding: '4px 0' }} />
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {paymentBlock}
        {notesBlock}
      </div>
      {footerBlock}
      <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
    </>
  );
}

export function renderCenteredFlow(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, is58mm, fs, RECEIPT_WATERMARK, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, storeNameBlock, storeInfoBlock, renderLogo, total, subtotal, discountAmount, taxAmount, taxLabel, previewWrap, TwoCol, itemRows } = props;
  return previewWrap(
    <div style={{ textAlign: 'center' }}>
      {settings.receiptShowBarcode !== false && (
        <div style={{ margin: '10px 0', display: 'flex', justifyContent: 'center' }}>
          <BarcodePreview value={`${settings.invoicePrefix || "INV"}-001234`} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {renderLogo({ width: '50px', height: '50px', border: '2px solid #000', borderRadius: '50%', margin: '0 auto 5px' })}
      {settings.receiptShowStoreName && storeNameBlock}
      <div style={{ marginBottom: '10px' }}>{storeInfoBlock}</div>
      <div style={bodyStyle}>
        {metaBlock}
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }} cellPadding={0} cellSpacing={0}>
          <thead><tr><th style={{ borderBottom: '1px solid #000', padding: '4px 0', textAlign: 'center' }}>QTY</th><th style={{ borderBottom: '1px solid #000', padding: '4px 0', textAlign: 'center' }}>ITEM</th><th style={{ borderBottom: '1px solid #000', padding: '4px 0', textAlign: 'center' }}>TOTAL</th></tr></thead>
          <tbody>
            {itemRows.map((item, index) => (
              <tr key={index}>
                <td style={{ padding: '4px 0', textAlign: 'center' }}>{item.qty}</td>
                <td style={{ padding: '4px 0', textAlign: 'center' }}>{item.name}</td>
                <td style={{ padding: '4px 0', textAlign: 'center' }}>{formatCurrency(item.subtotal, settings.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '10px 0', marginTop: '10px' }}>
          {settings.receiptShowDiscount !== false && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>SUBTOTAL</span><span>{formatCurrency(subtotal, settings.currency)}</span></div>}
          {settings.receiptShowDiscount !== false && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>DISCOUNT</span><span>-{formatCurrency(discountAmount, settings.currency)}</span></div>}
          {settings.receiptShowTax && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>{taxLabel} ({settings.taxRate}%)</span><span>{formatCurrency(taxAmount, settings.currency)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', margin: '6px 0' }}><span>GRAND TOTAL</span><span>{formatCurrency(total, settings.currency)}</span></div>
        </div>
        {paymentBlock}
        {notesBlock}
      </div>
      {settings.receiptShowFooter !== false && settings.receiptFooter && (
        <div style={{ textAlign: 'center', marginTop: '15px', whiteSpace: 'pre-wrap', fontSize: `${fs.footer}px` }}>{settings.receiptFooter}</div>
      )}
      {settings.receiptShowFooter !== false && settings.storeWebsite && (
        <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </div>
  );
}

export function renderLeftGrid(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, fs, RECEIPT_WATERMARK, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, storeNameBlock, storeInfoBlock, renderLogo, total, is58mm, previewWrap, TwoCol, itemRows } = props;
  return previewWrap(
    <>
      <div style={{ marginBottom: '15px' }}>
        <div style={{ width: '100%', borderBottom: '3px solid #000', paddingBottom: '5px', fontSize: '16px', fontWeight: 'bold' }}>{settings.storeName || 'STORE NAME'}</div>
        {storeInfoBlock}
      </div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {defaultItemsTable}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {totalsBlock}
        <TwoCol left="TOTAL" right={formatCurrency(total, settings.currency)} bold lg style={{ padding: '4px 0' }} />
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {paymentBlock}
        {notesBlock}
      </div>
      {settings.receiptShowBarcode !== false && (
        <div style={{ textAlign: 'left', margin: '10px 0' }}>
          <BarcodePreview value={`${settings.invoicePrefix || "INV"}-001234`} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {settings.receiptShowFooter !== false && settings.receiptFooter && (
        <div style={{ textAlign: 'left', marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: `${fs.footer}px` }}>{settings.receiptFooter}</div>
      )}
      {settings.receiptShowFooter !== false && settings.storeWebsite && (
        <div style={{ textAlign: 'left', marginTop: '4px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </>
  );
}

export function renderSplitColumns(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, RECEIPT_WATERMARK, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, footerBlock, storeNameBlock, storeInfoBlock, renderLogo, total, previewWrap, TwoCol, itemRows } = props;
  return previewWrap(
    <>
      <div style={{ textAlign: 'center', borderBottom: '1px dotted #000', paddingBottom: '10px', marginBottom: '10px' }}>
        {renderLogo({ width: '50px', height: '50px', border: '2px solid #000', borderRadius: '8px', margin: '0 auto 5px' })}
        {settings.receiptShowStoreName && storeNameBlock}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '5px' }}>
          <span>{settings.receiptShowStoreAddress && settings.storeAddress}</span>
          <span>
            {settings.receiptShowStorePhone && (settings.storePhone || '+92 300 0000000')}
            {settings.receiptShowStoreEmail && ` | ${settings.storeEmail || 'contact@mystore.com'}`}
          </span>
        </div>
      </div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ borderTop: '1px dotted #000', width: '100%', margin: '4px 0' }} />
        {defaultItemsTable}
        <div style={{ borderTop: '1px dotted #000', width: '100%', margin: '6px 0' }} />
        {totalsBlock}
        <TwoCol left="TOTAL" right={formatCurrency(total, settings.currency)} bold lg style={{ padding: '4px 0' }} />
        <div style={{ borderTop: '1px dotted #000', width: '100%', margin: '6px 0' }} />
        {paymentBlock}
        {notesBlock}
      </div>
      {footerBlock}
    </>
  );
}

export function renderFloatingTotals(props: RenderReceiptLayoutProps) {
  const { settings, fs, bodyStyle, RECEIPT_WATERMARK, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, footerBlock, storeNameBlock, storeInfoBlock, renderLogo, total, previewWrap, TwoCol, itemRows } = props;
  return previewWrap(
    <>
      {settings.receiptShowStoreName && (
        <div style={{ fontWeight: fs.shopName, fontSize: `${fs.shopName}px`, borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: '2px', marginBottom: '10px' }}>
          {settings.storeName || 'ZAYNAHS POS'}
        </div>
      )}
      <div style={{ marginBottom: '15px' }}>{storeInfoBlock}</div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {defaultItemsTable}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '10px' }}>
          <div style={{ width: '70%' }}>
            {totalsBlock}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px' }}>
              <span>GRAND TOTAL</span><span>{formatCurrency(total, settings.currency)}</span>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {paymentBlock}
        {notesBlock}
      </div>
      {footerBlock}
    </>
  );
}
