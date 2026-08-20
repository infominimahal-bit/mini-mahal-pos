import type { ProductFormData } from './useProductForm';
import { BasicInfoFields } from './BasicInfoFields';
import { PricingStockFields } from './PricingStockFields';
import { MediaConfigFields } from './MediaConfigFields';

interface ProductFormFieldsProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  categories: string[];
  suppliers: string[];
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onGenerateSku: () => void;
  onGenerateBarcode: () => void;
  onAddCategory: () => void;
  onAddSupplier: () => void;
  onOpenMediaLibrary: () => void;
  onOpenScanner: () => void;
}

function ProductFormFields(props: ProductFormFieldsProps) {
  return (
    <>
      <BasicInfoFields {...props} />
      <PricingStockFields {...props} />
      <MediaConfigFields {...props} />
    </>
  );
}

export { ProductFormFields };
export type { ProductFormFieldsProps };
