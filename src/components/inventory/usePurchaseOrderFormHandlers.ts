import { sonner } from '../../lib/sonner';

interface UsePurchaseOrderFormHandlersArgs {
  poMode: 'auto' | 'manual';
  manualList: any[];
  setManualList: React.Dispatch<React.SetStateAction<any[]>>;
  setAutoOverrides: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setIsGenerated: (v: boolean) => void;
  appProducts: any[];
}

export function usePurchaseOrderFormHandlers({
  poMode,
  manualList,
  setManualList,
  setAutoOverrides,
  setIsGenerated,
  appProducts: _appProducts
}: UsePurchaseOrderFormHandlersArgs) {
  const updateItem = (id: string, field: string, value: any) => {
    if (poMode === 'manual') {
      setManualList(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    } else {
      setAutoOverrides(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), [field]: value }
      }));
    }
  };

  const applyBatchDetails = (batchSupplier: string, batchCategory: string) => {
    if (!batchSupplier && !batchCategory) return;
    setManualList(prev => prev.map(p => ({
      ...p,
      supplier: batchSupplier || p.supplier,
      category: batchCategory || p.category
    })));
    if (batchSupplier) sonner.success(`Applied supplier "${batchSupplier}" to all items`);
  };

  const addAllToManual = (products: any[]) => {
    const toAdd = products.filter(p => !manualList.find(m => m.id === p.id));
    if (toAdd.length === 0) {
      sonner.info('All items are already in the list');
      return;
    }
    setManualList(prev => [...prev, ...toAdd.map(p => ({ ...p, neededQty: 1 }))]);
    setIsGenerated(true);
    sonner.success(`Added ${toAdd.length} items to manual PO list`);
  };

  const addToManualList = (product: any) => {
    if (manualList.find(p => p.id === product.id)) {
      sonner.warning('Product already in manual list');
      return;
    }
    setManualList(prev => [...prev, { ...product, neededQty: 1 }]);
    setIsGenerated(true);
  };

  const removeFromManualList = (id: string) => {
    setManualList(prev => prev.filter(p => p.id !== id));
  };

  const handleRemoveFromPO = (id: string, name: string) => {
    setAutoOverrides(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), removed: true }
    }));
    sonner.info(`Removed "${name}" from reorder list`);
  };

  return {
    updateItem,
    applyBatchDetails,
    addAllToManual,
    addToManualList,
    removeFromManualList,
    handleRemoveFromPO
  };
}
