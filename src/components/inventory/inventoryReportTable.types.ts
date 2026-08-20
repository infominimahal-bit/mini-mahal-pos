import type { InventoryReportRow, SortField } from './inventoryReportManager.types';

export interface InventoryReportTableProps {
  data: InventoryReportRow[];
  allData: InventoryReportRow[];
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onToggleSort: (field: SortField) => void;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}
