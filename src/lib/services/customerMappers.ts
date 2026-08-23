import {
  Customer,
} from '../../types';

export const mapCustomer = (item: any): Customer => ({
  ...item,
  priceTier: item.price_tier ?? item.priceTier,
  totalPurchases: parseFloat(item.total_purchases ?? item.totalPurchases) || 0,
  balance: parseFloat(item.balance) || 0,
  creditLimit: parseFloat(item.credit_limit ?? item.creditLimit) || 0,
  creditUsed: parseFloat(item.credit_used ?? item.creditUsed) || 0,
  allowCredit: item.allow_credit ?? item.allowCredit ?? true,
  lastPurchase: item.last_purchase ? new Date(item.last_purchase) : (item.lastPurchase ? new Date(item.lastPurchase) : undefined),
  preferredCategories: item.preferred_categories ?? item.preferredCategories,
  createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(item.updatedAt)
});

export const toRemoteCustomer = (c: Partial<Customer>) => {
  const remote: any = { ...c };
  if ('priceTier' in c) { remote.price_tier = c.priceTier; delete remote.priceTier; }
  if ('totalPurchases' in c) { remote.total_purchases = c.totalPurchases; delete remote.totalPurchases; }
  if ('lastPurchase' in c) { remote.last_purchase = c.lastPurchase instanceof Date ? c.lastPurchase.toISOString() : c.lastPurchase; delete remote.lastPurchase; }
  if ('preferredCategories' in c) { remote.preferred_categories = c.preferredCategories; delete remote.preferredCategories; }
  if ('creditLimit' in c) { remote.credit_limit = c.creditLimit; delete remote.creditLimit; }
  if ('creditUsed' in c) { remote.credit_used = c.creditUsed; delete remote.creditUsed; }
  if ('allowCredit' in c) { remote.allow_credit = c.allowCredit; delete remote.allowCredit; }
  if ('createdAt' in c) { remote.created_at = c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt; delete remote.createdAt; }
  if ('updatedAt' in c) { remote.updated_at = c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt; delete remote.updatedAt; }
  return remote;
};
