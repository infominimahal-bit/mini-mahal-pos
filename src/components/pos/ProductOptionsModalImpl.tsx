import { useProductsStore, useSettingsStore } from '../../stores';
import { useState } from 'react';
import { Product, CartAddonItem } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { useAddonQuantity } from './useAddonQuantity';
import { ProductOptionsBody } from './ProductOptionsBody';
import { ProductOptionsFooter } from './ProductOptionsFooter';

interface ProductOptionsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: {
    selectedVariant?: string;
    selectedVariantId?: string;
    selectedVariantLabel?: string;
    addonItems?: CartAddonItem[];
    serialNumber?: string;
    overrideProduct?: Product;
  }) => void;
}

export function ProductOptionsModal({ product, isOpen, onClose, onConfirm }: ProductOptionsModalProps) {
  const appProducts = useProductsStore(s => s.products);
  const appSettings = useSettingsStore(s => s.settings);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedVariationChildId, setSelectedVariationChildId] = useState<string>('');
  const [addonItems, setAddonItems] = useState<CartAddonItem[]>([]);
  const [serialNumber, setSerialNumber] = useState('');

  const updateAddonQuantity = useAddonQuantity(appProducts, setAddonItems);

  const childVariations = product.productType === 'variable'
    ? appProducts.filter(p => p.parentId === product.id && p.productType === 'variation')
    : [];

  if (!isOpen) return null;

  const handleConfirm = () => {
    let overrideProduct: Product | undefined;

    if (product.productType === 'variable') {
      overrideProduct = childVariations.find(c => c.id === selectedVariationChildId);
      if (!overrideProduct) return;
    } else if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (!selectedVariants[variant.name]) {
          return;
        }
      }
    }

    if (product.requireSerial && !serialNumber.trim()) {
      return;
    }

    let selectedVariantId: string | undefined;
    let selectedVariantLabel: string | undefined;
    if (variantString && product.variantData && product.variantData.length > 0 && product.productType !== 'variable') {
      const selectedParts = variantString.split(',').map(s => s.trim());
      const matchingVariant = product.variantData.find(vd => {
        let match = true;
        if (vd.option1 && !selectedParts.includes(vd.option1)) match = false;
        if (vd.option2 && !selectedParts.includes(vd.option2)) match = false;
        return match;
      });
      if (matchingVariant) {
        if (matchingVariant.trackInventory && (matchingVariant.stock ?? 0) <= 0) {
          return;
        }
        selectedVariantId = matchingVariant.id;
        selectedVariantLabel = matchingVariant.cardTitle || variantString;
      }
    }

    onConfirm({
      selectedVariant: variantString || undefined,
      selectedVariantId,
      selectedVariantLabel,
      addonItems: addonItems.length > 0 ? addonItems : undefined,
      serialNumber: serialNumber.trim() || undefined,
      overrideProduct
    });
  };

  const isFormValid = () => {
    if (product.productType === 'variable') {
      if (!selectedVariationChildId) return false;
      const child = childVariations.find(c => c.id === selectedVariationChildId);
      if (child?.trackInventory && child.stock <= 0) return false;
    } else if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (!selectedVariants[variant.name]) return false;
      }
    }
    if (product.requireSerial && !serialNumber.trim()) return false;
    if (isVariantOutOfStock) return false;
    return true;
  };

  let variantString = '';
  if (Object.keys(selectedVariants).length > 0) {
    variantString = Object.entries(selectedVariants)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  let basePrice = product.price;
  let matchingVariant: (typeof product.variantData)[number] | undefined;

  if (product.productType === 'variable' && selectedVariationChildId) {
    const child = childVariations.find(c => c.id === selectedVariationChildId);
    if (child) basePrice = child.price;
  } else if (variantString && product.variantData && product.variantData.length > 0) {
    const selectedParts = variantString.split(',').map(s => s.trim());
    matchingVariant = product.variantData.find(vd => {
      let match = true;
      if (vd.option1 && !selectedParts.includes(vd.option1)) match = false;
      if (vd.option2 && !selectedParts.includes(vd.option2)) match = false;
      return match;
    });

    if (matchingVariant && matchingVariant.priceOverride !== undefined) {
      basePrice = matchingVariant.priceOverride;
    }
  }

  let totalPrice = basePrice;
  addonItems.forEach(item => {
    totalPrice += item.subtotal;
  });

  const isVariantOutOfStock = product.productType === 'variable'
    ? (childVariations.find(c => c.id === selectedVariationChildId)?.trackInventory && (childVariations.find(c => c.id === selectedVariationChildId)?.stock ?? 0) <= 0)
    : (matchingVariant?.trackInventory && (matchingVariant.stock ?? 0) <= 0);

  const footer = (
    <ProductOptionsFooter
      totalPrice={totalPrice}
      appSettings={appSettings}
      isFormValid={isFormValid()}
      isVariantOutOfStock={isVariantOutOfStock}
      matchingVariant={matchingVariant}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      maxWidth="sm"
      footer={footer}
    >
      <ProductOptionsBody
        product={product}
        appProducts={appProducts}
        appSettings={appSettings}
        childVariations={childVariations}
        selectedVariationChildId={selectedVariationChildId}
        setSelectedVariationChildId={setSelectedVariationChildId}
        selectedVariants={selectedVariants}
        setSelectedVariants={setSelectedVariants}
        addonItems={addonItems}
        updateAddonQuantity={updateAddonQuantity}
        serialNumber={serialNumber}
        setSerialNumber={setSerialNumber}
      />
    </Modal>
  );
}
