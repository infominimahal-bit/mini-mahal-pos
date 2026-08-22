import { sonner } from '../../../lib/sonner';
import { useProductsStore, useInventoryStore } from '../../../stores';
import { Product } from '../../../types';
import type { ProductFormData } from './useProductForm';

// Remove scalar + per-variant stock so a product write never sets products.stock
// directly — stock is ledger-driven (stock_history insert → DB trigger).
function stripStockFields(p: any) {
  const c = { ...p };
  delete c.stock;
  if (Array.isArray(c.variantData)) {
    c.variantData = c.variantData.map((v: any) => { const x = { ...v }; delete x.stock; return x; });
  }
  return c;
}

interface UseProductSubmitArgs {
  product: Product | null;
  formData: ProductFormData;
  variants: any[];
  variantData: any[];
  modifiers: any[];
  productAddons: any[];
  appCurrentUser: any;
  appSuppliers: any[];
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  setVariants: React.Dispatch<React.SetStateAction<any[]>>;
  setVariantData: React.Dispatch<React.SetStateAction<any[]>>;
  setModifiers: React.Dispatch<React.SetStateAction<any[]>>;
  onClose: () => void;
}

export function useProductSubmit({
  product,
  formData,
  variants,
  variantData,
  modifiers,
  productAddons,
  appCurrentUser,
  appSuppliers,
  setFormData,
  setVariants,
  setVariantData,
  setModifiers,
  onClose,
}: UseProductSubmitArgs) {
  const handleSubmit = async () => {
    const role = appCurrentUser?.role;
    if (role === 'cashier') {
      await sonner.alert('Permission Denied', 'Cashiers are not allowed to add or modify products.');
      return;
    }

    if (!formData.name.trim()) {
      await sonner.alert('Error!', 'Please enter a product name');
      return;
    }

    if (!(formData.category || '').trim()) {
      await sonner.alert('Error!', 'Please enter a category');
      return;
    }

    if (!(formData.sku || '').trim()) {
      formData.sku = `SKU-${Date.now().toString().slice(-6)}`;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      await sonner.alert('Error!', 'Please enter a valid price');
      return;
    }

    if (!formData.cost || parseFloat(formData.cost) < 0) {
      await sonner.alert('Error!', 'Please enter a valid cost price (or 0 if no cost)');
      return;
    }

    if (formData.trackInventory) {
      if (formData.minStock && parseInt(formData.minStock) < 0) {
        await sonner.alert('Error!', 'Min stock cannot be negative');
        return;
      }
    }

    const productData: Product = {
      id: product?.id || Date.now().toString(),
      name: formData.name,
      sku: formData.sku,
      barcode: formData.barcode || undefined,
      price: parseFloat(formData.price) || 0,
      cost: parseFloat(formData.cost) || 0,
      stock: formData.trackInventory ? (parseFloat(formData.stock) || 0) : 999999,
      minStock: formData.trackInventory ? (parseFloat(formData.minStock) || 0) : 0,
      targetStock: formData.trackInventory && formData.targetStock ? (parseFloat(formData.targetStock) || undefined) : undefined,
      category: formData.category,
      supplier: formData.supplier || undefined,
      description: formData.description,
      taxable: formData.taxable,
      active: formData.active,
      isWeightBased: false,
      pricePerUnit: undefined,
      unit: undefined,
      image: formData.image || undefined,
      productType: formData.productType || 'simple',
      trackInventory: formData.trackInventory,
      isFeatured: formData.isFeatured,
      isService: formData.isService,
      requireSerial: formData.requireSerial,
      variants: variants.map(({ name, options }) => ({ name, options })),
      variantData,
      modifiers,
      productAddons,
      createdAt: product?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      const { productsService } = await import('../../../lib/services');

      if (product) {
        if (product.trackInventory && productData.trackInventory && product.stock !== productData.stock) {
          const { localDb, generateId } = await import('../../../lib/localDb');
          const { cloudWrite } = await import('../../../lib/cloudWrite');
          const { toRemoteStockHistory } = await import('../../../lib/services');
          const diff = (productData.stock || 0) - (product.stock || 0);
          const histId = generateId();
          const histEntry = {
            id: histId,
            productId: product.id,
            changeQty: diff,
            type: 'adjustment' as const,
            referenceId: 'MANUAL_EDIT',
            note: 'Direct Stock Edit via Form',
            balanceAfter: productData.stock || 0,
            cashierName: 'System',
            createdAt: new Date()
          };
          await cloudWrite('stock_history', 'create', histId, toRemoteStockHistory(histEntry));
          await localDb.stockHistory.add(histEntry);
        }
        // stock already applied via the stock_history insert above; never write it directly.
        await productsService.update(productData.id, stripStockFields(productData));
        useProductsStore.getState().updateProduct(productData);
      } else {
        if (formData.supplier.trim()) {
          const { suppliersService } = await import('../../../lib/services');
          const existingSupplier = appSuppliers.find(
            s => s.name.toLowerCase() === formData.supplier.trim().toLowerCase()
          );

          if (!existingSupplier) {
            const newSupp = await suppliersService.create({
              name: formData.supplier.trim(),
              email: '', phone: '', address: '', businessType: 'General',
              paymentTerms: '', openingBalance: 0, rating: 0
            });
            useInventoryStore.getState().setSuppliers([...appSuppliers, newSupp]);
          }
        }

        // Create WITHOUT stock (cloud default 0); initial stock is ledger-driven.
        const newProduct = await productsService.create(stripStockFields(productData));
        if (productData.trackInventory && (productData.stock || 0) > 0) {
          const { localDb, generateId } = await import('../../../lib/localDb');
          const { cloudWrite } = await import('../../../lib/cloudWrite');
          const { toRemoteStockHistory } = await import('../../../lib/services');
          const initId = generateId();
          const initEntry = {
            id: initId,
            productId: newProduct.id,
            changeQty: productData.stock,
            type: 'stock_in' as const,
            note: 'Initial Stock on Create',
            balanceAfter: productData.stock,
            cashierName: 'System',
            createdAt: new Date()
          };
          await cloudWrite('stock_history', 'create', initId, toRemoteStockHistory(initEntry));
          await localDb.stockHistory.add(initEntry);
        }
        // Local cache keeps the intended stock for display (cloud trigger will match).
        useProductsStore.getState().addProduct({ ...newProduct, stock: productData.stock, variantData: productData.variantData });
      }

      sonner.success(product ? 'Product updated successfully' : 'Product added successfully');

      if (!product) {
        setFormData({
          name: '',
          sku: '',
          barcode: '',
          price: '',
          cost: '',
          stock: '',
          minStock: '',
          targetStock: '',
          category: '',
          supplier: '',
          description: '',
          taxable: true,
          active: true,
          trackInventory: true,
          isFeatured: false,
          image: '',
          isService: false,
          requireSerial: false,
        });
        setVariants([]);
        setVariantData([]);
        setModifiers([]);
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      sonner.close();

      const errorMsg = error.message || '';

      if (errorMsg.toLowerCase().includes('already exists')) {
        sonner.error(errorMsg);
        return;
      }

      if (error.code === '23505' || error.status === 409) {
        const details = error.details?.toLowerCase() || '';
        let errorMessage = 'A product with this SKU or Barcode already exists.';

        if (details.includes('sku')) {
          errorMessage = 'The SKU you entered already exists. Please use a unique SKU.';
        } else if (details.includes('barcode')) {
          errorMessage = 'The Barcode you entered already exists. Please use a unique barcode.';
        }

        sonner.error(errorMessage);
        return;
      }

      const fallbackMessage = 'Failed to save product. Please try again.';
      await sonner.alert('Error!', fallbackMessage);
    }
  };

  return handleSubmit;
}
