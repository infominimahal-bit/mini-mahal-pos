import {
  Supplier,
} from '../../types';

export const mapSupplier = (item: any): Supplier => ({
  id: item.id,
  name: item.name || '',
  email: item.email || '',
  phone: item.phone || '',
  address: item.address || '',
  businessType: item.business_type || item.businessType || '',
  paymentTerms: item.payment_terms || item.paymentTerms || '',
  openingBalance: Number(item.opening_balance ?? item.openingBalance ?? 0),
  rating: Number(item.rating ?? 0),
  createdAt: item.created_at ? new Date(item.created_at) : (item.createdAt ? new Date(item.createdAt) : new Date()),
  updatedAt: item.updated_at ? new Date(item.updated_at) : (item.updatedAt ? new Date(item.updatedAt) : undefined)
});

export const toRemoteSupplier = (s: Partial<Supplier>) => {
  const remote: any = { ...s };
  if ('paymentTerms' in s) { remote.payment_terms = s.paymentTerms; delete remote.paymentTerms; }
  if ('openingBalance' in s) { remote.opening_balance = s.openingBalance; delete remote.openingBalance; }
  if ('businessType' in s) { remote.business_type = s.businessType; delete remote.businessType; }
  if ('createdAt' in s) { remote.created_at = s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt; delete remote.createdAt; }
  if ('updatedAt' in s) { remote.updated_at = s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt; delete remote.updatedAt; }
  return remote;
};

export const toRemoteSupplierTransaction = (t: any) => {
  const remote: any = { ...t };
  if ('id' in t && t.id) remote.id = t.id;
  if ('supplierId' in t && t.supplierId !== undefined) remote.supplier_id = t.supplierId;
  if ('type' in t && t.type !== undefined) remote.type = t.type;
  if ('sourceType' in t && t.sourceType !== undefined) remote.source_type = t.sourceType;
  if ('amount' in t && t.amount !== undefined) remote.amount = t.amount;
  if ('referenceId' in t && t.referenceId !== undefined) remote.reference_id = t.referenceId;
  if ('referenceType' in t && t.referenceType !== undefined) remote.reference_type = t.referenceType;
  if ('note' in t && t.note !== undefined) remote.note = t.note;
  if ('balanceAfter' in t && t.balanceAfter !== undefined) remote.balance_after = t.balanceAfter;
  if ('isManualOverride' in t && t.isManualOverride !== undefined) remote.is_manual_override = t.isManualOverride;
  if ('overrideBy' in t && t.overrideBy !== undefined) remote.override_by = t.overrideBy;
  if ('createdAt' in t && t.createdAt !== undefined) remote.created_at = t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt;
  if ('updatedAt' in t && t.updatedAt !== undefined) remote.updated_at = t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt;
  return remote;
};
