export type SortField = 'name' | 'stock' | 'stockValue' | 'profitMargin' | 'status' | 'soldQty' | 'revenue' | 'cogs' | 'grossProfit';
export type SortDir = 'asc' | 'desc';

export interface InventoryReportRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  stock: number;
  minStock: number;
  costPrice: number;
  sellingPrice: number;
  stockValue: number;
  potentialRevenue: number;
  profitMargin: number;
  stockStatus: 'Out of Stock' | 'Low Stock' | 'In Stock' | 'Infinity Mode';
  soldQty: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  batches: any[];
  isInfinite: boolean;
  recentSales: any[];
}

export interface InventoryReportManagerProps {
  startDate: Date;
  endDate: Date;
  globalSupplier?: string;
  globalCategory?: string;
  globalStore?: string;
  sales?: any[];
}
