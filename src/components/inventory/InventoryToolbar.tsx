import { Plus, Upload, Download, Layers, Trash2, Printer } from 'lucide-react';
import { Button } from '../../shared/ui';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { SharedSearchBar } from '../../shared/modules/search-and-list';

interface InventoryToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  handleImportJSON: () => void;
  handleExportSelected: () => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  selectedType: string;
  onTypeChange: (val: string) => void;
  sortBy: 'name' | 'stock' | 'price';
  sortOrder: 'asc' | 'desc';
  onSortChange: (by: 'name' | 'stock' | 'price', order: 'asc' | 'desc') => void;
  canManageStock: boolean;
  selectedCount: number;
  handleBulkDelete: () => void;
  onBulkEdit: () => void;
  onPrintBarcodes: () => void;
  onAddProduct: () => void;
  onScanClick: () => void;
}

export function InventoryToolbar({
  searchTerm,
  onSearchChange,
  handleImportJSON,
  handleExportSelected,
  categories,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  sortBy,
  sortOrder,
  onSortChange,
  canManageStock,
  selectedCount,
  _filteredCount,
  handleBulkDelete,
  onBulkEdit,
  onPrintBarcodes,
  onAddProduct,
  onScanClick,
}: InventoryToolbarProps) {
  return (
    <div className="relative z-30 bg-white/50 dark:bg-black/20 p-2.5 lg:p-4 rounded-2xl lg:rounded-[1.75rem] border border-gray-200/50 dark:border-white/5 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Contextual Actions Grid */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 order-2 lg:order-1">
          {canManageStock && (
            <>
              <Button
                variant="primary"
                size="md"
                onClick={() => { onAddProduct(); }}
                className="col-span-2 sm:col-auto !px-4 sm:!px-5 !py-2 sm:!py-2.5 !text-[9px] sm:!text-[10px] !shadow-lg !shadow-emerald-500/20 hover:!scale-[1.02]"
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                <span>{"Add Item"}</span>
              </Button>
              <Button variant="secondary" size="md" onClick={handleImportJSON} className="!px-4 !py-2.5 !text-[9px] !font-black !bg-white dark:!bg-zinc-900 !border-gray-200 dark:!border-white/10 !text-gray-700 dark:!text-gray-300 hover:!bg-gray-100 dark:hover:!bg-white/10 !rounded-xl" icon={<Upload className="h-4 w-4" />}>
                <span>{"Import"}</span>
              </Button>
              <Button variant="primary" size="md" onClick={handleExportSelected} className="!px-4 !py-2.5 !text-[9px] !font-black !bg-emerald-50 dark:!bg-primary/10 !border-emerald-100 dark:!border-primary/20 !text-primary dark:!text-emerald-400 hover:!bg-emerald-50 dark:hover:!bg-primary/10 !rounded-xl !shadow-none" icon={<Download className="h-4 w-4" />}>
                <span>{"Export"}</span>
              </Button>
            </>
          )}
        </div>

        {/* Search Box — shared module (SharedSearchBar) */}
        <div className="flex-1 order-1 lg:order-2">
          <SharedSearchBar
            value={searchTerm}
            onChange={(val) => { onSearchChange(val); }}
            placeholder={"Search name, barcode, SKU..."}
            onScanClick={() => onScanClick()}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 order-3">
          <SearchableSelect
            options={categories.map(c => ({ id: c, label: c === 'All' ? "Categories: All" : c }))}
            value={selectedCategory}
            onChange={val => { onCategoryChange(val); }}
            placeholder={"Category"}
          />
          <SearchableSelect
            options={[
              { id: 'All', label: "Type: All Items" },
              { id: 'standard', label: "Type: Standard Products" },
              { id: 'services', label: "Type: Service Items" },
              { id: 'serialized', label: "Type: IMEI / Serialized" }
            ]}
            value={selectedType}
            onChange={val => { onTypeChange(val); }}
            placeholder={"Item Type"}
          />
          <SearchableSelect
            options={[
              { id: 'name-asc', label: "Sort: A-Z" },
              { id: 'name-desc', label: "Sort: Z-A" },
              { id: 'stock-asc', label: "Stock: Low" },
              { id: 'stock-desc', label: "Stock: High" }
            ]}
            value={`${sortBy}-${sortOrder}`}
            onChange={val => {
              const [field, order] = val.split('-');
              onSortChange(field as 'name' | 'stock' | 'price', order as 'asc' | 'desc');
            }}
            placeholder={"Sort"}
            align="right"
          />
        </div>
      </div>

      {/* Bulk Actions Bar (Visible when selected) */}
      {canManageStock && selectedCount > 0 && (
        <div className="flex items-center gap-2 mt-3 p-1 bg-gray-900 dark:bg-black border border-white/10 rounded-2xl animate-in slide-in-from-bottom-2 duration-300 overflow-x-auto scrollbar-hide shadow-2xl">
          <div className="flex flex-col items-center justify-center px-4 py-1 border-r border-white/10 shrink-0">
            <span className="text-[11px] font-black text-primary leading-none">{selectedCount}</span>
            <span className="text-[7px] font-black text-primary/50 uppercase tracking-tighter">Selected</span>
          </div>

          <div className="flex items-center gap-1 p-1 pr-3">
            <Button variant="ghost" onClick={onBulkEdit} className="!min-h-0 !px-4 !py-2 !rounded-xl !bg-transparent !text-[10px] !font-black !text-blue-400 hover:!bg-blue-500/10 whitespace-nowrap">
              <Layers className="h-3.5 w-3.5" /> <span className="hidden sm:inline">BULK EDIT</span><span className="sm:hidden">EDIT</span>
            </Button>
            <Button variant="ghost" onClick={handleBulkDelete} className="!min-h-0 !px-4 !py-2 !rounded-xl !bg-transparent !text-[10px] !font-black !text-red-400 hover:!bg-red-500/10 whitespace-nowrap">
              <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">DELETE</span><span className="sm:hidden">DEL</span>
            </Button>
            <Button variant="ghost" onClick={onPrintBarcodes} className="!min-h-0 !px-4 !py-2 !rounded-xl !bg-transparent !text-[10px] !font-black !text-emerald-400 hover:!bg-primary/10 whitespace-nowrap">
              <Printer className="h-3.5 w-3.5" /> <span className="hidden sm:inline">PRINT BARCODES</span><span className="sm:hidden">BARCODE</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
