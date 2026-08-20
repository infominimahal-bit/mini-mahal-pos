import {
  Expense,
} from '../../types';

export const mapExpense = (item: any): Expense => ({
  ...item,
  paymentMethod: item.payment_method ?? item.paymentMethod,
  amount: item.amount ? Number(item.amount) : 0,
  date: item.date ? new Date(item.date) : new Date(),
  storeType: item.store_type ?? item.storeType,
  addedBy: item.added_by ?? item.addedBy,
  createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(item.updatedAt)
});

export const toRemoteExpense = (e: Partial<Expense>) => {
  const remote: any = { ...e };
  if ('paymentMethod' in e) { remote.payment_method = e.paymentMethod; delete remote.paymentMethod; }
  if ('storeType' in e) { remote.store_type = e.storeType; delete remote.storeType; }
  if ('addedBy' in e) { remote.added_by = (e as any).addedBy; delete remote.addedBy; }
  if ('isManualOverride' in e) { remote.is_manual_override = e.isManualOverride; delete remote.isManualOverride; }
  if ('overrideBy' in e) { remote.override_by = e.overrideBy; delete remote.overrideBy; }
  if ('createdAt' in e) { remote.created_at = e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt; delete remote.createdAt; }
  if ('updatedAt' in e) { remote.updated_at = e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt; delete remote.updatedAt; }
  return remote;
};
