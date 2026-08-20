export interface PurchaseOrderFormProps {
  isGenerated: boolean;
  poMode: 'auto' | 'manual';
  activeList: any[];
  totalItemsNeeded: number;
  estimatedCost: number;
  selectedSupplier: string;
  selectedCategory: string;
  appSettings: any;
  paginatedList: any[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (n: number) => void;
  isAdmin: boolean;
  appProducts: any[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  batchSupplier: string;
  batchCategory: string;
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  manualList: any[];
  setManualList: React.Dispatch<React.SetStateAction<any[]>>;
  setAutoOverrides: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setIsGenerated: (v: boolean) => void;
  exportColumns: any[];
  exportRows: any[];
}

export interface PurchaseOrderFormTableProps {
  activeList: any[];
  totalItemsNeeded: number;
  paginatedList: any[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (n: number) => void;
  isAdmin: boolean;
  isGenerated: boolean;
  poMode: 'auto' | 'manual';
  selectedSupplier: string;
  selectedCategory: string;
  estimatedCost: number;
  appSettings: any;
  updateItem: (id: string, field: string, value: any) => void;
  handleRemoveFromPO: (id: string, name: string) => void;
  removeFromManualList: (id: string) => void;
}
