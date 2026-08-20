import { MediaLibrary } from '../../../shared/MediaLibrary';
import { CameraScanner } from '../../../shared/ui/CameraScanner';
import { Modal } from '../../../shared/ui';
import { useState } from 'react';
import { Product } from '../../../types';
import { useProductForm } from './useProductForm';
import { ProductFormFields } from './ProductFormFields';
import { ProductAdvanced } from './ProductAdvanced';
import { ProductModalFooter } from './ProductModalFooter';
import { useProductSubmit } from './useProductSubmit';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const {
    appCurrentUser,
    appSuppliers,
    appProducts,
    formData,
    setFormData,
    batches,
    setBatches,
    variants,
    setVariants,
    variantData,
    setVariantData,
    modifiers,
    setModifiers,
    productAddons,
    setProductAddons,
    batchTotalStock,
    categories,
    suppliers,
    handleChange,
    generateBarcode,
    generateSku,
    handleAddCategory,
    handleAddSupplier,
  } = useProductForm(product);

  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleSubmit = useProductSubmit({
    product,
    formData,
    batches,
    batchTotalStock,
    variants,
    variantData,
    modifiers,
    productAddons,
    appCurrentUser,
    appSuppliers,
    setFormData,
    setBatches,
    setVariants,
    setVariantData,
    setModifiers,
    onClose,
  });

  if (!isOpen) return null;

  const footer = (
    <ProductModalFooter product={product} onClose={onClose} onSubmit={handleSubmit} />
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={product ? "edit_product" : "register_new_product"}
        maxWidth="lg"
        footer={footer}
      >
        <div className="space-y-6">
          <ProductFormFields
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            suppliers={suppliers}
            onFieldChange={handleChange}
            onGenerateSku={generateSku}
            onGenerateBarcode={generateBarcode}
            onAddCategory={handleAddCategory}
            onAddSupplier={handleAddSupplier}
            onOpenMediaLibrary={() => setShowMediaLibrary(true)}
            onOpenScanner={() => setShowScanner(true)}
          />
          <ProductAdvanced
            formData={formData}
            setFormData={setFormData}
            variants={variants}
            setVariants={setVariants}
            variantData={variantData}
            setVariantData={setVariantData}
            productAddons={productAddons}
            setProductAddons={setProductAddons}
            appProducts={appProducts}
            product={product}
          />
        </div>
      </Modal>

      {showMediaLibrary && (
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={(url) => setFormData(prev => ({ ...prev, image: url }))}
        />
      )}

      {showScanner && (
        <CameraScanner
          onScan={(code) => {
            const normalized = code.trim().toUpperCase().replace(/O/g, '0');
            setFormData(prev => ({ ...prev, barcode: normalized }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
