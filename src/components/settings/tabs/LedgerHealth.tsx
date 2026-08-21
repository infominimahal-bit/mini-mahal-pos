import React, { useState } from 'react';
import { useUsersStore } from '../../../stores';
import { runReconciliation } from '../../../lib/services/reconciliationService';
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

export const LedgerHealth: React.FC = () => {
  const currentUser = useUsersStore(s => s.currentUser);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (currentUser?.role !== 'admin') return null;

  const run = async () => {
    setLoading(true);
    try {
      const r = await runReconciliation();
      setResult(r);
    } catch (e: any) {
      setResult({ error: e?.message || 'Failed to run reconciliation' });
    } finally {
      setLoading(false);
    }
  };

  const score = result?.healthScore ?? null;
  const badge = score == null
    ? 'bg-gray-500'
    : score >= 100 ? 'bg-emerald-600'
    : score >= 80 ? 'bg-amber-600'
    : 'bg-red-600';

  const sections = [
    { label: 'Stock Drift', rows: result?.stockDrift },
    { label: 'Wallet Drift', rows: result?.walletDrift },
    { label: 'Over-refunds', rows: result?.overRefunds },
    { label: 'Orphan Sales', rows: result?.orphanSales },
  ];

  return (
    <div className="bg-white dark:bg-black/30 rounded-2xl p-5 border border-gray-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">Ledger Health</h3>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="text-xs font-bold bg-primary text-white px-4 py-2 rounded-xl disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run Check'}
        </button>
      </div>

      {score != null && (
        <div className={`inline-flex items-center gap-2 text-white text-sm font-black px-3 py-1.5 rounded-xl ${badge}`}>
          {result?.isClean ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          Health Score: {score}/100
        </div>
      )}

      {result?.error && <p className="text-xs text-red-500 mt-3">{result.error}</p>}

      {result && !result.error && (
        <div className="mt-4 space-y-3">
          {sections.map(sec => (
            <div key={sec.label}>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                {sec.label} — {(sec.rows || []).length} issue(s)
              </p>
              {(sec.rows || []).length > 0 && (
                <pre className="text-[10px] bg-black/5 dark:bg-white/5 rounded-lg p-2 mt-1 overflow-auto max-h-40">
                  {JSON.stringify(sec.rows, null, 2)}
                </pre>
              )}
            </div>
          ))}
          <p className="text-[10px] text-gray-500 pt-2 border-t border-gray-200 dark:border-white/10">
            Run these in Supabase SQL Editor to verify zero rows:
            <br />SELECT * FROM stock_drift; SELECT * FROM wallet_drift; SELECT * FROM over_refunds; SELECT * FROM orphan_sales;
          </p>
        </div>
      )}
    </div>
  );
};
