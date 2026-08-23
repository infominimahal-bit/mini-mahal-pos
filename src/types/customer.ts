export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  priceTier: 'retail' | 'wholesale' | 'premium';
  totalPurchases: number;
  balance?: number;       // Running balance (positive = customer owes us)
  creditLimit?: number;  // Max credit allowed (0 = no limit)
  creditUsed?: number;   // How much credit currently used
  allowCredit?: boolean; // Per-customer credit enable/disable
  lastPurchase?: Date;
  createdAt: Date;
  updatedAt?: Date;
  preferredCategories?: string[];
  notes?: string;
}

export interface CustomerLedger {
  id: string;
  customerId: string;
  saleId?: string;
  type: 'sale' | 'payment_received' | 'refund' | 'adjustment' | 'credit' | 'opening' | 'sale_credit';
  debit: number;        // money customer OWES (sale on credit)
  credit: number;       // money customer PAYS / refund
  balanceAfter: number; // running balance after this entry
  reference?: string;
  note?: string;
  createdBy?: string;
  createdAt: Date;
}