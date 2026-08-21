import { supabase } from '../supabase';
import { fetchAllPages } from './utils';

export async function runReconciliation() {
  const [stockDrift, walletDrift, overRefunds, orphanSales] = await Promise.all([
    fetchAllPages(() => supabase.from('stock_drift').select('*')),
    fetchAllPages(() => supabase.from('wallet_drift').select('*')),
    fetchAllPages(() => supabase.from('over_refunds').select('*')),
    fetchAllPages(() => supabase.from('orphan_sales').select('*')),
  ]);
  const issues = stockDrift.length + walletDrift.length + overRefunds.length + orphanSales.length;
  return {
    stockDrift,
    walletDrift,
    overRefunds,
    orphanSales,
    healthScore: Math.max(0, 100 - issues * 10),
    isClean: issues === 0,
  };
}
