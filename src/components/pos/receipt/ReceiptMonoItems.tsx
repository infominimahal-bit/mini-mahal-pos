import { formatCurrency } from '../../../lib/currencies';
import { TwoCol } from './parts';
import { type ReceiptCtx } from './types';

export function MonoItems(ctx: ReceiptCtx) {
  const { sale, appBundles, showDiscount, baseWeight, fs, clamp, currencyCode } = ctx;
  return (
    (() => {
      const groupItems = (items: any[]) => {
        const bundlesMap = new Map<string, any>();
        const standaloneItems: any[] = [];
        items.forEach(item => {
          const bundleId = item.bundleId || item.bundle_id;
          const bundleName = item.bundleName || item.bundle_name;
          if (bundleId) {
            if (!bundlesMap.has(bundleId)) {
              bundlesMap.set(bundleId, {
                bundleId,
                bundleName,
                items: [],
                totalOriginal: 0,
                totalDiscount: 0,
                totalSubtotal: 0
              });
            }
            const b = bundlesMap.get(bundleId)!;
            b.items.push(item);
            const itemPrice = item.product?.price || ((item.subtotal + item.discount) / (item.quantity || 1));
            const original = itemPrice * item.quantity;
            b.totalOriginal += original;
            b.totalDiscount += (item.discount || 0);
            b.totalSubtotal += (item.subtotal || 0);
          } else {
            standaloneItems.push(item);
          }
        });
        const bundles = Array.from(bundlesMap.values()).map(b => {
          let bundleQty = 1;
          const firstCartItem = b.items[0];
          if (firstCartItem) {
            const bundleIdFull = firstCartItem.bundleId || firstCartItem.bundle_id;
            const originalBundleDefId = bundleIdFull?.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0] || bundleIdFull;
            const bundleDef = appBundles?.find(bd => bd.id === originalBundleDefId);

            if (bundleDef && bundleDef.items && bundleDef.items.length > 0) {
              const firstBi = bundleDef.items[0];
              const cItem = b.items.find((x: any) => x.product.id === firstBi.productId);
              if (cItem) {
                bundleQty = Math.round(cItem.quantity / firstBi.quantity);
              }
            } else if (firstCartItem.quantity > 0) {
              bundleQty = firstCartItem.quantity;
            }
          }

          if (bundleQty === 0) bundleQty = 1;

          return {
            ...b,
            bundleQty
          };
        });

        return {
          bundles,
          standaloneItems
        };
      };

      const { bundles, standaloneItems } = groupItems(sale.items);

      const renderedBundlesSection = bundles.length > 0 ? (
        <div key="bundles-section" style={{ marginBottom: '6px' }}>
          <div style={{ fontWeight: clamp(baseWeight + 300), fontSize: `${fs.body}px`, marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7c3aed' }}>
            BUNDLE / DEAL ITEMS ({bundles.length})
          </div>
          {bundles.map((b, bIdx) => {
            return (
              <div key={`bundle-${b.bundleId}`} style={{ marginBottom: '6px', textTransform: 'uppercase' }}>
                <div style={{ fontWeight: clamp(baseWeight + 300), marginBottom: '2px' }}>
                  {bIdx + 1}. 🎁 {b.bundleQty > 1 ? `${b.bundleQty}x ` : ''}{b.bundleName}
                </div>

                <div style={{ paddingLeft: '8px', marginBottom: '4px' }}>
                  {b.items.map((item: any, idx: number) => (
                    <div key={idx} style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.9, marginBottom: '1px' }}>
                      - {b.bundleQty > 0 ? Math.round(item.quantity / b.bundleQty) : item.quantity}x {item.product?.name || 'Item'}
                      {item.selectedVariantLabel ? ` (${item.selectedVariantLabel})` : item.selectedVariant ? ` (${item.selectedVariant})` : ''}
                      {item.selectedModifiers?.length > 0 ? ` +${item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), currencyCode)})`).join(',')}` : ''}
                      {item.addonItems?.length > 0 ? ` + Add-ons: ${item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), currencyCode)})`).join(', ')}` : ''}
                      {item.toppings?.length > 0 ? ` + ${item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), currencyCode)})`).join(', ')}` : ''}
                    </div>
                  ))}
                </div>

                {showDiscount ? (
                  <>
                    <TwoCol ctx={ctx} left="  DEAL SUBTOTAL" right={formatCurrency(b.totalOriginal, currencyCode)} style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.7 }} />
                    {b.totalDiscount > 0 && (
                      <TwoCol ctx={ctx} left="  🎁 DEAL DISCOUNT" right={`-${formatCurrency(b.totalDiscount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, color: '#dc2626', fontWeight: 'bold' }} />
                    )}
                    <TwoCol ctx={ctx} left="  DEAL PRICE" right={formatCurrency(b.totalSubtotal, currencyCode)} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, fontWeight: 'bold' }} />
                  </>
                ) : (
                  <TwoCol ctx={ctx} left="  DEAL PRICE" right={formatCurrency(b.totalSubtotal, currencyCode)} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, fontWeight: 'bold' }} />
                )}
              </div>
            );
          })}
        </div>
      ) : null;

      const renderedStandalonesSection = standaloneItems.length > 0 ? (
        <div key="standalone-section" style={{ marginBottom: '6px' }}>
          <div style={{ fontWeight: clamp(baseWeight + 300), fontSize: `${fs.body}px`, marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6b7280' }}>
            OTHER / STANDALONE ITEMS ({standaloneItems.length})
          </div>
          {standaloneItems.map((item, index) => (
            <div key={`standalone-${index}`} style={{ marginBottom: '6px', textTransform: 'uppercase' }}>
              <div style={{ textAlign: 'left', wordWrap: 'break-word' }}>{index + 1}. {item.product?.name || 'Item'}</div>
              {item.selectedVariantLabel && (
                <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>{item.selectedVariantLabel}</div>
              )}
              {!item.selectedVariantLabel && item.selectedVariant && (
                <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>{item.selectedVariant}</div>
              )}
              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>+ {item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), currencyCode)})`).join(', ')}</div>
              )}
              {item.addonItems && item.addonItems.length > 0 && (
                <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>+ Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), currencyCode)})`).join(', ')}</div>
              )}
              {item.toppings && item.toppings.length > 0 && (
                <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>+ {item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), currencyCode)})`).join(', ')}</div>
              )}
              {item.serialNumber && (
                <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>SN: {item.serialNumber}</div>
              )}
              <TwoCol ctx={ctx} left={`${item.quantity} PCS x ${formatCurrency(item.subtotal / item.quantity, currencyCode)}`} right={formatCurrency(item.subtotal, currencyCode)} />
              {showDiscount && item.discount > 0 && (
                <TwoCol ctx={ctx} left={`DISCOUNT ${item.discountType === 'percentage' && item.discountValue ? `(${item.discountValue}%)` : ''}`} right={`-${formatCurrency(item.discount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8, marginTop: '2px' }} />
              )}
            </div>
          ))}
        </div>
      ) : null;

      return (
        <>
          {renderedBundlesSection}
          {renderedStandalonesSection}
        </>
      );
    })()
  );
}
