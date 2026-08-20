import { formatCurrency } from '../../../lib/currencies';
import { TwoCol } from './parts';
import { type ReceiptCtx } from './types';

export function renderPaymentSection(ctx: ReceiptCtx) {
  const { sale, baseWeight, clamp, currencyCode } = ctx;
  return (
    <div style={{ marginTop: '4px', marginBottom: '4px', textTransform: 'uppercase' }}>
      {sale.paymentMethod === 'split' && sale.splitPayments ? (
        <div style={{ marginBottom: '4px' }}>
          <div style={{ textAlign: 'left', fontWeight: clamp(baseWeight + 200) }}>SPLIT PAYMENT:</div>
          {sale.splitPayments.map((p: any, i: number) => (<TwoCol ctx={ctx} key={i} left={p.method} right={formatCurrency(p.amount, currencyCode)} />))}
        </div>
      ) : (
        <div style={{ textAlign: 'left' }}>PAID: {sale.paymentMethod}</div>
      )}
      <TwoCol ctx={ctx} left="CHG:" right={formatCurrency(sale.changeAmount || 0, currencyCode)} />
    </div>
  );
}
