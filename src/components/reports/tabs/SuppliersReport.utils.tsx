import { Fragment } from 'react';
import { Badge } from '../../../shared/ui';
import { Supplier } from '../../../types';

export interface SupplierReportRow {
  supplier: Supplier;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  transactionCount: number;
}

export const sourceBadgeBase = '!rounded !px-1.5 !text-[8px] !tracking-normal';

export const getSourceBadge = (sourceType: string) => {
  if (sourceType === 'auto_purchase') {
    return <Badge className={`${sourceBadgeBase} !bg-blue-500/10 !text-blue-400 dark:!text-blue-400 !border-blue-500/20`}>AUTO</Badge>;
  }
  if (sourceType === 'payment') {
    return <Badge className={`${sourceBadgeBase} !bg-primary/10 !text-emerald-400 dark:!text-emerald-400 !border-primary/20`}>PAID</Badge>;
  }
  if (sourceType === 'opening_balance') {
    return <Badge className={`${sourceBadgeBase} !bg-violet-500/10 !text-violet-400 dark:!text-violet-400 !border-violet-500/20`}>OPENING</Badge>;
  }
  return <Badge tone="danger" className={`${sourceBadgeBase} !bg-red-500/10 !text-red-400 dark:!text-red-400 !border-red-500/20`}>BILL</Badge>;
};
