import { useState, useEffect } from 'react';
import Dexie from 'dexie';
import { formatCurrency } from '../../../lib/currencies';
import { HelpTooltip } from '../../../shared/ui/HelpTooltip';
import { localDb } from '../../../lib/localDb';
import { getStartOfDayInTimezone, getEndOfDayInTimezone } from '../../../lib/dateUtils';
import { getAmountByMethod } from '../../../lib/services';

export function WalletStrip({ currency, timezone }: { currency: string, timezone?: string }) {
  const [modes, setModes] = useState<any[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      Dexie.ignoreTransaction(async () => {
        // 1. Get mode structures
      const m = await localDb.paymentModes.toArray();
      const order = ['cash', 'card', 'online'];
      m.sort((a: any, b: any) => order.indexOf(a.id) - order.indexOf(b.id));

      // 2. Fetch today's sales
      const tz = timezone || 'Asia/Karachi';
      const start = getStartOfDayInTimezone(new Date(), tz);
      const end = getEndOfDayInTimezone(new Date(), tz);
      const todaySales = await localDb.sales
        .where('timestamp')
        .between(start, end)
        .toArray();

      // 3. Compute totals
      const totals = { cash: 0, card: 0, online: 0 };
      todaySales.forEach(t => {
        const addToWallet = (method: 'cash' | 'card' | 'online', amt: number) => {
          totals[method] = Math.round((totals[method] + amt) * 100) / 100;
        };

        if (t.status !== 'pending') {
          addToWallet('cash', getAmountByMethod(t, 'cash'));
          addToWallet('card', getAmountByMethod(t, 'card'));
          addToWallet('online', getAmountByMethod(t, 'online'));
        }

        if (t.status === 'refunded') {
          addToWallet('cash', -getAmountByMethod(t, 'cash'));
          addToWallet('card', -getAmountByMethod(t, 'card'));
          addToWallet('online', -getAmountByMethod(t, 'online'));
        } else if (t.status === 'partially_refunded') {
          const refundedAmt = t.refundedAmount || 0;
          addToWallet('cash', -(t.paymentMethod === 'split'
            ? refundedAmt * (getAmountByMethod(t, 'cash') / (t.total || 1))
            : (t.paymentMethod === 'cash' || !t.paymentMethod ? refundedAmt : 0)));
          addToWallet('card', -(t.paymentMethod === 'split'
            ? refundedAmt * (getAmountByMethod(t, 'card') / (t.total || 1))
            : (t.paymentMethod === 'card' ? refundedAmt : 0)));
          addToWallet('online', -(t.paymentMethod === 'split'
            ? refundedAmt * (getAmountByMethod(t, 'online') / (t.total || 1))
            : (t.paymentMethod === 'online' ? refundedAmt : 0)));
        }
      });

      // 4. Merge
      const finalModes = m.map(mode => ({
        ...mode,
        balance: totals[mode.id as 'cash' | 'card' | 'online'] || 0
      }));

      if (alive) setModes(finalModes);
      });
    };
    load();
    const subs: any[] = [];
    try {
      subs.push(localDb.sales.hook('creating').subscribe(() => load()));
      subs.push(localDb.sales.hook('updating').subscribe(() => load()));
      subs.push(localDb.sales.hook('deleting').subscribe(() => load()));
    } catch { /* hooks unsupported */ }
    return () => { alive = false; subs.forEach(s => s?.unsubscribe?.()); };
  }, [timezone]);

  if (!modes.length) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-[8px] sm:text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest flex items-center">
          Today's Drawer
          <HelpTooltip content="Shows total collected today for each method (Cash Flow). This is not the all-time absolute balance." />
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {modes.map((md: any) => (
          <div key={md.id} className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 relative group">
            <p className="text-[7px] font-black uppercase tracking-widest text-gray-500 truncate">{md.name}</p>
            <p className="text-[11px] font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(md.balance || 0, currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
