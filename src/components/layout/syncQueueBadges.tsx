import { Receipt, Package, Users, Wallet, Layers, Building2, Database, ShieldAlert, RefreshCw, Clock } from 'lucide-react';
import { Badge } from '../../shared/ui';

export function getEntityIcon(entity: string) {
  const e = entity.toLowerCase();
  if (e.includes('sale')) return <Receipt className="w-4 h-4 text-primary" />;
  if (e.includes('product')) return <Package className="w-4 h-4 text-blue-500" />;
  if (e.includes('customer')) return <Users className="w-4 h-4 text-purple-500" />;
  if (e.includes('expense')) return <Wallet className="w-4 h-4 text-rose-500" />;
  if (e.includes('category')) return <Layers className="w-4 h-4 text-amber-500" />;
  if (e.includes('supplier')) return <Building2 className="w-4 h-4 text-teal-500" />;
  return <Database className="w-4 h-4 text-gray-600" />;
}

export function getStatusBadge(op: any) {
  const retries = op.retries || 0;
  const isFailed = op.status === 'failed';

  if (isFailed) return (
    <Badge tone="danger" size="sm" className="!px-1.5 !py-0.5 !rounded-lg !text-[8px] !text-rose-500 !border-rose-500/20">
      <ShieldAlert className="w-2.5 h-2.5" /> {"STUCK"}
    </Badge>
  );

  if (retries > 0) return (
    <Badge tone="warning" size="sm" className="!px-1.5 !py-0.5 !rounded-lg !text-[8px] !text-amber-500 !border-amber-500/20">
      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> {retries}
    </Badge>
  );

  return (
    <Badge tone="info" size="sm" className="!px-1.5 !py-0.5 !rounded-lg !text-[8px] !text-blue-500 !border-blue-500/20">
      <Clock className="w-2.5 h-2.5" /> {"WAIT"}
    </Badge>
  );
}

export function getGroupStatusBadge(children: any[]) {
  const hasFailed = children.some(c => c.status === 'failed');
  const maxRetries = Math.max(...children.map(c => c.retries || 0));

  if (hasFailed) return (
    <Badge tone="danger" size="sm" className="!px-1.5 !py-0.5 !rounded-lg !text-[8px] !text-rose-500 !border-rose-500/20">
      <ShieldAlert className="w-2.5 h-2.5" /> {"STUCK"}
    </Badge>
  );
  if (maxRetries > 0) return (
    <Badge tone="warning" size="sm" className="!px-1.5 !py-0.5 !rounded-lg !text-[8px] !text-amber-500 !border-amber-500/20">
      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> {maxRetries}
    </Badge>
  );
  return (
    <Badge tone="info" size="sm" className="!px-1.5 !py-0.5 !rounded-lg !text-[8px] !text-blue-500 !border-blue-500/20">
      <Clock className="w-2.5 h-2.5" /> {"WAIT"}
    </Badge>
  );
}

export function getGroupLabel(children: any[]) {
  const saleOp = children.find(c => c.entity === 'sales');
  if (saleOp) return `Sale ${saleOp.opType}`;
  const entities = [...new Set(children.map(c => c.entity))];
  return entities.join(', ');
}
