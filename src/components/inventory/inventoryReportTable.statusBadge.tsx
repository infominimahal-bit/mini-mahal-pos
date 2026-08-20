import { Badge } from '../../shared/ui';
import { XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  if (status === 'Infinity Mode') return <Badge tone="info" size="sm" className="!rounded !text-[8px] !bg-violet-500/10 !text-violet-500 dark:!text-violet-500" icon={<span>∞</span>}>{"INFINITY"}</Badge>;
  if (status === 'Out of Stock') return <Badge tone="danger" size="sm" className="!rounded !text-[8px] !bg-red-500/10 !text-red-500 dark:!text-red-500" icon={<XCircle className="w-2.5 h-2.5" />}>{"OUT"}</Badge>;
  if (status === 'Low Stock') return <Badge tone="warning" size="sm" className="!rounded !text-[8px] !bg-amber-500/10 !text-amber-500 dark:!text-amber-500" icon={<AlertTriangle className="w-2.5 h-2.5" />}>{"LOW"}</Badge>;
  return <Badge tone="success" size="sm" className="!rounded !text-[8px] !bg-primary/10 !text-primary dark:!text-primary" icon={<CheckCircle2 className="w-2.5 h-2.5" />}>{"OK"}</Badge>;
}
