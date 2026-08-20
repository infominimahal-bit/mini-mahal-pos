import { useProductsStore, useSettingsStore } from '../../stores';
import { sonner } from '../../lib/sonner';
import { productsService } from '../../lib/services';
import { localDb } from '../../lib/localDb';

interface UseProductsListHandlersArgs {
  appProducts: any[];
  selectedProductIds: string[];
  setSelectedProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  filteredProducts: any[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  setShowBarcodeGenerator: (v: boolean) => void;
  setBarcodeProducts: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useProductsListHandlers({
  appProducts,
  selectedProductIds,
  setSelectedProductIds,
  filteredProducts,
  fileInputRef,
  setShowBarcodeGenerator,
  setBarcodeProducts
}: UseProductsListHandlersArgs) {
  const handleDeleteProduct = async (productId: string) => {
    const result = await sonner.deleteConfirm('product');
    if (result.isConfirmed) {
      try {
        await productsService.delete(productId);
        useProductsStore.getState().deleteProduct(productId);
        sonner.success('Product deleted successfully!');
      } catch (error) {
        sonner.error('Failed to delete product');
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const result = await sonner.confirm('Bulk Delete?', `Are you sure you want to delete ${selectedProductIds.length} selected products?`);
    if (result.isConfirmed) {
      sonner.loading('Deleting products...');
      try {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < selectedProductIds.length; i += CHUNK_SIZE) {
          const chunk = selectedProductIds.slice(i, i + CHUNK_SIZE);
          await productsService.bulkDelete(chunk);
        }
        useProductsStore.getState().setProducts(appProducts.filter(p => !selectedProductIds.includes(p.id)));
        setSelectedProductIds([]);
        sonner.success('Bulk deletion completed');
      } catch (error) {
        sonner.error('Failed to bulk delete products.');
      } finally {
        sonner.close();
      }
    }
  };

  const handleExportSelected = () => {
    if (selectedProductIds.length === 0) return;
    const selectedProducts = appProducts.filter(p => selectedProductIds.includes(p.id));
    const exportData = { version: '2.0', timestamp: new Date().toISOString(), data: { products: selectedProducts } };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventory_Products_${new Date().toLocaleDateString('en-CA')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    sonner.success('Inventory exported to JSON backup');
  };

  const handleImportJSON = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      sonner.loading('Reading file...');
      const text = await file.text();
      let importData;
      try { importData = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON file.'); }
      const products = importData.data?.products || importData.products || (Array.isArray(importData) ? importData : null);
      if (!products || !Array.isArray(products)) throw new Error('Invalid file format.');

      const confirmed = await sonner.confirm('Bulk Import?', `Found ${products.length} products. Proceed?`);
      if (!confirmed.isConfirmed) { sonner.dismissAll(); return; }
      sonner.loading(`Importing ${products.length} products...`);

      const allLocalProducts = await localDb.products.toArray();
      const existingNames = new Set(allLocalProducts.map(p => (p.name || '').trim().toLowerCase()));

      const duplicates: string[] = [];
      const productsToCreate: any[] = [];
      for (const p of products) {
        if (!p.name || !p.name.trim()) continue;
        const nameClean = p.name.trim().toLowerCase();
        if (existingNames.has(nameClean)) duplicates.push(p.name);
        else productsToCreate.push(p);
      }

      if (duplicates.length > 0) {
        const proceedWithoutDups = await sonner.confirm('Duplicates Detected', `Skipped ${duplicates.length} existing. Import remaining ${productsToCreate.length}?`);
        if (!proceedWithoutDups.isConfirmed) { sonner.dismissAll(); return; }
      }
      if (productsToCreate.length === 0) {
        sonner.dismissAll();
        await sonner.alert('Import Skipped', 'All products already exist.', 'OK');
        return;
      }

      sonner.loading(`Importing ${productsToCreate.length} products...`);
      const newlyCreatedProducts: any[] = [];
      for (const p of productsToCreate) {
        const payload = { ...p, active: p.active !== false };
        const created = await productsService.create(payload as any);
        newlyCreatedProducts.push(created);
      }
      useProductsStore.getState().addProductsBulk(newlyCreatedProducts);
      sonner.dismissAll();
      await sonner.alert('Import Successful', `Imported ${newlyCreatedProducts.length} products.`, 'Great!');
    } catch (err: any) {
      sonner.dismissAll();
      sonner.alert('Import Failed', err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    handleDeleteProduct,
    handleSelectAll,
    handleSelectProduct,
    handleBulkDelete,
    handleExportSelected,
    handleImportJSON,
    handleFileChange
  };
}
