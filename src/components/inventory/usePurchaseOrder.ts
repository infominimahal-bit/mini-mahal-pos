import { useInventoryStore, useProductsStore, useSettingsStore } from '../../stores';
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { commitStockInToInventory } from '../../lib/stockInCommit';
import { sonner } from '../../lib/sonner';

const ITEMS_PER_PAGE = 25;

export function usePurchaseOrder() {
  const appProducts = useProductsStore(s => s.products);
  const appSuppliers = useInventoryStore(s => s.suppliers);
  const appSettings = useSettingsStore(s => s.settings);
  const appCategories = useInventoryStore(s => s.categories);

  const { profile } = useAuth();
  const isAdmin = true;

  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGenerated, setIsGenerated] = useState(false);

  const [poMode, setPoMode] = useState<'auto' | 'manual'>('auto');
  const [manualList, setManualList] = useState<any[]>([]);
  const [autoOverrides, setAutoOverrides] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSupplier, setBatchSupplier] = useState('');
  const [batchCategory, setBatchCategory] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [recordAsSupplierBill, setRecordAsSupplierBill] = useState(true);

  const suppliers = useMemo(() => {
    const sups = appProducts.map(p => p.supplier).filter(Boolean);
    return ['All', ...Array.from(new Set(sups)).sort()];
  }, [appProducts]);

  const categories = useMemo(() => {
    const cats = appProducts.map(p => p.category).filter(Boolean);
    return ['All', ...Array.from(new Set(cats)).sort()];
  }, [appProducts]);

  const deficiencyList = useMemo(() => {
    return appProducts.filter(p => {
      if (p.trackInventory === false) return false;
      const minStock = p.minStock || 5;
      return p.stock <= minStock || (p.targetStock != null && p.stock < p.targetStock);
    }).map(p => {
      const target = p.targetStock || (p.minStock != null ? p.minStock + 10 : 15);
      return {
        ...p,
        neededQty: Math.max(0, target - p.stock)
      };
    });
  }, [appProducts]);

  const filteredList = useMemo(() => {
    let list = deficiencyList;
    if (selectedSupplier !== 'All') {
      if (selectedSupplier === 'Unassigned') {
        list = list.filter(p => !p.supplier);
      } else {
        list = list.filter(p => p.supplier === selectedSupplier);
      }
    }
    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory);
    }
    return list;
  }, [deficiencyList, selectedSupplier, selectedCategory]);

  const activeList = useMemo(() => {
    const base = poMode === 'auto' ? filteredList : manualList;
    return base
      .filter(item => !(autoOverrides[item.id] && autoOverrides[item.id].removed))
      .map(item => ({
        ...item,
        ...(autoOverrides[item.id] || {})
      }));
  }, [poMode, filteredList, manualList, autoOverrides]);

  const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE);
  const paginatedList = activeList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalItemsNeeded = activeList.reduce((sum, item) => sum + Number(item.neededQty || 0), 0);
  const estimatedCost = activeList.reduce((sum, item) => sum + (Number(item.neededQty || 0) * Number(item.cost || 0)), 0);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setIsGenerated(false);
    setCurrentPage(1);
  };

  const handleGenerate = () => {
    setIsGenerated(true);
    if (filteredList.length === 0) {
      sonner.info('No products require restocking based on your filters.');
    } else {
      sonner.success(`Generated PO Draft with ${filteredList.length} items.`);
    }
  };

  const handleBulkAdmit = async () => {
    if (activeList.length === 0) return;

    const result = await sonner.confirm(
      'Convert PO to Stock?',
      `This will add total <strong>${totalItemsNeeded} items</strong> across ${activeList.length} products to your active inventory. Proceed?`,
      'Yes, Admit Stock'
    );

    if (!result.isConfirmed) return;

    sonner.loading('Processing bulk stock entry...');

    try {
      const now = new Date();

      await commitStockInToInventory({
        items: activeList.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku || '',
          quantity: Number(item.neededQty || 0),
          costPrice: Number(item.cost || 0),
          supplier: item.supplier || 'PO TRANSIT',
          type: 'Stock IN',
          notes: `Bulk PO Restock | ${now.toLocaleDateString()}`
        })),
        recordAsSupplierBill,
        suppliers: appSuppliers,
        profile,
        date: now
      });

      sonner.success('Bulk reorder successfully added to inventory!');
      setIsGenerated(false);
      setManualList([]);
      setAutoOverrides({});
    } catch (error) {
      console.error('Bulk Admit Failed:', error);
      sonner.error('Failed to process bulk stock entry.');
    }
  };

  const exportColumns = [
    { key: 'sku', label: "SKU" },
    { key: 'name', label: "Product Name" },
    { key: 'category', label: "Category" },
    { key: 'supplier', label: "Supplier" },
    { key: 'stock', label: "Current", format: 'number' as const },
    { key: 'targetStock', label: "Target Stock" },
    { key: 'neededQty', label: "Qty", format: 'number' as const },
    { key: 'cost', label: `Unit Cost (${appSettings.currency})`, format: 'currency' as const },
    { key: 'subtotal', label: `Subtotal (${appSettings.currency})`, format: 'currency' as const },
  ];

  const exportRows = useMemo(() => activeList.map(p => ({
    sku: p.sku || '',
    name: p.name,
    category: p.category || '',
    supplier: p.supplier || 'Unassigned',
    stock: p.stock,
    targetStock: p.targetStock ?? '-',
    neededQty: p.neededQty || 0,
    cost: Number(p.cost || 0),
    subtotal: (p.neededQty || 0) * (p.cost || 0),
  })), [activeList]);

  const handleReset = async () => {
    const isManual = poMode === 'manual';
    const message = isManual
      ? 'This will instantly wipe all items added to the current list. Proceed?'
      : 'This will reset all manual overrides and filters for the reorder list. Proceed?';

    const res = await sonner.confirm(
      isManual ? 'Clear Manual PO List?' : 'Reset Auto PO Settings?',
      message,
      isManual ? 'Clear Everything' : 'Reset All'
    );

    if (res.isConfirmed) {
      if (isManual) {
        setManualList([]);
      } else {
        setAutoOverrides({});
        setSelectedSupplier('All');
        setSelectedCategory('All');
      }
      setIsGenerated(false);
      sonner.success(isManual ? 'Manual PO list cleared' : 'Auto PO settings reset');
    }
  };

  return {
    appProducts,
    appSuppliers,
    appSettings,
    appCategories,
    profile,
    isAdmin,
    selectedSupplier,
    setSelectedSupplier,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    isGenerated,
    setIsGenerated,
    poMode,
    setPoMode,
    manualList,
    setManualList,
    autoOverrides,
    setAutoOverrides,
    searchQuery,
    setSearchQuery,
    batchSupplier,
    setBatchSupplier,
    batchCategory,
    setBatchCategory,
    showScanner,
    setShowScanner,
    recordAsSupplierBill,
    setRecordAsSupplierBill,
    suppliers,
    categories,
    filteredList,
    activeList,
    paginatedList,
    totalPages,
    totalItemsNeeded,
    estimatedCost,
    exportColumns,
    exportRows,
    handleFilterChange,
    handleGenerate,
    handleBulkAdmit,
    handleReset
  };
}
