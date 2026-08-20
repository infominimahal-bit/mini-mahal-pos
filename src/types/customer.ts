export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  priceTier: 'retail' | 'wholesale' | 'premium';
  totalPurchases: number;
  balance?: number; // Running customer balance (owed by customer). Derived from customer_ledger.
  lastPurchase?: Date;
  createdAt: Date;
  updatedAt?: Date;
  preferredCategories?: string[]; // CRM: Track what they buy most
  notes?: string; // CRM: Special instructions, birthday, etc.
}

export interface CustomerLedger {
  id: string;
  customerId: string;
  saleId?: string;
  type: 'sale' | 'payment' | 'refund' | 'adjustment' | 'credit' | 'opening';
  debit: number;   // money customer OWES (sale)
  credit: number;  // money customer PAYS / is refunded (payment, refund)
  balanceAfter: number;
  reference?: string;
  note?: string;
  createdBy?: string;
  createdAt: Date;
}