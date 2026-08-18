import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, Button, Badge, EmptyState } from '../../shared/ui';
import { sonner } from '../../lib/sonner';
import { SkeletonLoader } from '../../shared/ui/SkeletonLoader';

interface Mismatch {
  id: string;
  kind: 'inventory' | 'wallet';
  entity_id: string;
  expected: number;
  actual: number;
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
  note: string | null;
}

interface InvariantViolation {
  check_name: string;
  entity_id: string;
}

export function ReconciliationDashboard() {
  const [mismatches, setMismatches] = useState<Mismatch[]>([]);
  const [violations, setViolations] = useState<InvariantViolation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const { data: mismatchData, error: mismatchError } = await supabase
        .from('stock_mismatches')
        .select('*')
        .order('detected_at', { ascending: false });

      if (mismatchError) throw mismatchError;
      setMismatches(mismatchData || []);

      const { data: violationData, error: violationError } = await supabase
        .from('invariant_violations')
        .select('*');

      if (violationError) throw violationError;
      setViolations(violationData || []);
    } catch (err) {
      console.error('Failed to fetch reconciliation records:', err);
      sonner.error('Failed to load records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleReconcileNow = async () => {
    setIsReconciling(true);
    try {
      const { data, error } = await supabase.rpc('reconcile_now');
      if (error) throw error;

      sonner.success(`Reconciliation complete. ${data || 0} new mismatches found.`);
      await fetchRecords();
    } catch (err) {
      console.error('Reconciliation failed:', err);
      sonner.error('Reconciliation failed. Check console.');
    } finally {
      setIsReconciling(false);
    }
  };

  const activeMismatches = mismatches.filter(m => !m.resolved);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Reconciliation Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor and resolve ledger drift across inventory and wallets.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleReconcileNow}
          disabled={isReconciling || isLoading}
          title="Run a manual audit: compares recorded stock/wallet balances against the movement ledger and logs any new mismatches. This tool NEVER runs automatically."
          className="whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isReconciling ? 'animate-spin' : ''}`} />
          Run Reconciliation
        </Button>
      </div>

      {/* ── COMPLETE GUIDE ─────────────────────────────────────────────── */}
      <Card className="p-5 bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p className="font-semibold text-indigo-700 dark:text-indigo-300">
              What is this? · When to run · Why it exists
            </p>
            <p>
              <strong>What:</strong> Scans your inventory ledger (<code>stock_history</code>) and wallet balances to detect{' '}
              <em>drift</em> — when the system&apos;s recorded stock does not match the movement history. It also flags critical
              invariant violations (e.g. negative stock, broken references).
            </p>
            <p>
              <strong>When:</strong> Run it whenever stock numbers look wrong, after a physical stock count, or periodically as a
              safety check. This is a <strong>MANUAL</strong> tool — it never runs automatically (auto-run was removed because it
              could erase legitimate sale / return movements).
            </p>
            <p>
              <strong>Why:</strong> Stock can drift from theft, damage, manual database edits, or sync anomalies. This dashboard is
              your last line of defense: &quot;Run Reconciliation&quot; checks for new drift, and every mismatch is logged below with
              Expected vs Actual so you can investigate and fix.
            </p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <SkeletonLoader count={3} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 border-l-4 border-l-red-500" title="Critical data-integrity checks that failed. Investigate immediately.">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400" title="Critical data-integrity checks that failed. Investigate immediately.">Invariant Violations</p>
                  <h3 className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{violations.length}</h3>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>

            <Card className={`p-6 border-l-4 ${activeMismatches.length > 0 ? 'border-l-orange-500' : 'border-l-green-500'}`} title="Stock/wallet values that don't match their ledger. 0 = healthy.">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400" title="Stock/wallet values that don't match their ledger. 0 = healthy.">Active Mismatches</p>
                  <h3 className={`text-2xl font-bold mt-1 ${activeMismatches.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                    {activeMismatches.length}
                  </h3>
                </div>
                <div className={`p-2 rounded-lg ${activeMismatches.length > 0 ? 'bg-orange-100 dark:bg-orange-500/20' : 'bg-green-100 dark:bg-green-500/20'}`}>
                  {activeMismatches.length > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
              </div>
            </Card>
          </div>

          {violations.length > 0 && (
            <Card className="border border-red-200 dark:border-red-900 overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-900/50">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Invariant Violations (Action Required)
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {violations.map((v, i) => (
                  <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <Badge variant="danger" className="mb-2 uppercase tracking-wide text-xs">{v.check_name}</Badge>
                      <p className="text-sm font-medium">Entity ID: <span className="font-mono">{v.entity_id}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="bg-gray-50 dark:bg-dark-800 px-6 py-4 border-b border-gray-100 dark:border-dark-700">
              <h3 className="text-lg font-semibold">Mismatch Log</h3>
            </div>

            {mismatches.length === 0 ? (
              <EmptyState
                icon={<CheckCircle />}
                title="System Healthy"
                subtext="No ledger mismatches detected."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-dark-800 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Entity ID</th>
                      <th className="px-6 py-3 font-medium text-right">Expected</th>
                      <th className="px-6 py-3 font-medium text-right">Actual</th>
                      <th className="px-6 py-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                    {mismatches.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-800/50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {new Date(m.detected_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={m.kind === 'inventory' ? 'primary' : 'warning'}>
                            {m.kind}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                          {m.entity_id.split('-')[0]}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                          {m.expected}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                          {m.actual}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {m.resolved ? (
                            <Badge variant="success">Resolved</Badge>
                          ) : (
                            <Badge variant="danger">Active</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
