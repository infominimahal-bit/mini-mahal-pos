import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore, useSettingsStore, useUiStore } from '../../stores';
import { Package, ChevronLeft, History, ClipboardList, Gift, Layers, Camera } from 'lucide-react';
import { Product } from '../../types';
import { Button } from '../../shared/ui';
import { SkeletonLoader } from '../../shared/ui/SkeletonLoader';
import { MediaLibrary } from '../../shared/MediaLibrary';
import { ReceiptPrint } from '../pos/ReceiptPrint';

import { ProductDetailHub } from './ProductDetailHub';
import { ProductModal } from './ProductModal';
import { PurchaseOrderSystem } from './PurchaseOrderSystem';
import { PurchaseHistory } from './PurchaseHistory';
import { BundleManager } from './BundleManager';
import { SupplierManager } from './suppliers/SupplierManager';
import { ProductsList } from './tabs/ProductsList';
import { CategoriesList } from './tabs/CategoriesList';

type TabType = 'inventory' | 'purchase_orders' | 'groups' | 'media' | 'purchases' | 'bundles' | 'store_sort' | 'suppliers';

export function InventoryManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subTab } = useParams();
  
  const appProducts = useProductsStore(s => s.products);
  const appPendingReturnTab = useUiStore(s => s.pendingReturnTab);
  const appSettings = useSettingsStore(s => s.settings);

  const { profile } = useAuth();

  const products = appProducts ?? [];
  // RBAC matrix: product add/edit/delete + stock = admin|manager; cashier view-only
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const canManageStock = isAdmin || profile?.canManageStock || profile?.canManagePO;
  const canManagePO = isAdmin || profile?.canManagePO;
  const canViewRecords = isAdmin || profile?.canViewRecords;
  const canEditProduct = profile?.role === 'admin' || profile?.canEditProduct;

  const SUB_TAB_SEGMENT_TO_INTERNAL: Record<string, TabType> = {
    products: 'inventory',
    history: 'purchases',
    restock: 'purchase_orders',
    bundles: 'bundles',
    groups: 'groups',
    media: 'media',
    'store-sort': 'store_sort',
    suppliers: 'suppliers',
  };
  
  const INTERNAL_TO_SUB_TAB_SEGMENT: Record<string, string> = {
    inventory: 'products',
    purchases: 'history',
    purchase_orders: 'restock',
    bundles: 'bundles',
    groups: 'groups',
    media: 'media',
    store_sort: 'store-sort',
    suppliers: 'suppliers',
  };

  const activeTab = (subTab ? SUB_TAB_SEGMENT_TO_INTERNAL[subTab] : 'inventory') as TabType;

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(() => localStorage.getItem('barcode_show_generator') === 'true');
  const [viewingSale, setViewingSale] = useState<any | null>(null);

  useEffect(() => {
    localStorage.setItem('barcode_show_generator', String(showBarcodeGenerator));
  }, [showBarcodeGenerator]);

  useEffect(() => {
    const navState = location.state as { productId?: string; fromSale?: string } | null;
    if (navState?.productId) {
      const product = products.find(p => p.id === navState.productId);
      if (product) setDetailProduct(product);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, products]);

  useEffect(() => {
    if (appPendingReturnTab === 'purchases') navigate('/inventory/history');
  }, [appPendingReturnTab]);

  useEffect(() => {
    const handleOpenProduct = (e: any) => {
      const product = products.find(p => p.id === e.detail);
      if (product) setDetailProduct(product);
    };
    window.addEventListener('open-product-hub', handleOpenProduct);
    return () => window.removeEventListener('open-product-hub', handleOpenProduct);
  }, [products]);

  const categories = useMemo(() => {
    const rawCategories = products.map((p: Product) => {
      const cat = p.category;
      if (typeof cat === 'string' && cat.trim().startsWith('{')) {
        try { return JSON.parse(cat).name || cat; } catch (_) {}
      }
      return cat;
    }).filter(Boolean);
    return ['All', ...Array.from(new Set(rawCategories))];
  }, [products]);

  const suppliers = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.supplier).filter(Boolean) as string[]))];
  }, [products]);

  if (!appSettings || !appProducts) {
    return <div className="p-6 bg-gray-50 dark:bg-transparent"><SkeletonLoader type="list" count={6} /></div>;
  }

  const freshProduct = detailProduct ? (products.find(p => p.id === detailProduct.id) || detailProduct) : null;

  return (
    <>
      {detailProduct && freshProduct && (
        <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50 dark:bg-app font-sans w-full max-w-[1400px] mx-auto">
          <ProductDetailHub
            product={freshProduct}
            onBack={() => {
              setDetailProduct(null);
              const navState = location.state as { fromSale?: string } | null;
              if (navState?.fromSale) {
                useUiStore.getState().setPendingReturnSaleId(navState.fromSale);
                navigate('/transactions');
              } else if (appPendingReturnTab) {
                const targetTab = appPendingReturnTab;
                useUiStore.getState().setPendingReturnTab(null);
                window.dispatchEvent(new CustomEvent('navigate', { detail: targetTab }));
              }
            }}
            onEdit={() => {}}
          />
        </div>
      )}

      {showProductModal && (
        <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50 dark:bg-app font-sans w-full max-w-[1400px] mx-auto">
          <ProductModal product={editingProduct} isOpen={true} onClose={() => { setShowProductModal(false); setEditingProduct(null); }} />
        </div>
      )}

      {!detailProduct && !showProductModal && !showBarcodeGenerator && (
        <div className="main-content-scroll p-1 sm:p-4 lg:p-6 space-y-3 lg:space-y-6 bg-gray-50 dark:bg-app max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-0 sm:pb-2">
            <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 xl:gap-10">
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }))} className="!min-h-0 !p-2 !rounded-xl !bg-transparent !text-gray-600 dark:!text-gray-400 hover:!bg-gray-100 dark:hover:!bg-white/5 mr-1">
                  <ChevronLeft className="h-5 w-5" />
                  <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{"Back"}</span>
                </Button>
                <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block" />
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner border border-primary/10">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="shrink-0 flex flex-col">
                  <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{"Inventory"}</h1>
                  <p className="hidden sm:block text-gray-600 dark:text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">{"Manage Stock"}</p>
                </div>
              </div>

              <div className="chip-nav-container overflow-x-auto flex-nowrap">
                {[
                  { id: 'inventory', label: "PRODUCTS", icon: Package, color: 'bg-primary', show: true },
                  { id: 'purchases', label: "HISTORY", icon: History, color: 'bg-blue-600', show: canViewRecords },
                  { id: 'purchase_orders', label: "RESTOCK", icon: ClipboardList, color: 'bg-rose-600', show: appSettings.enablePurchaseOrders !== false && canManagePO },
                  { id: 'bundles', label: "BUNDLES & DEALS", icon: Gift, color: 'bg-violet-600', show: true },
                  { id: 'groups', label: "GROUPS", icon: Layers, color: 'bg-indigo-600', show: true },
                  { id: 'media', label: "MEDIA", icon: Camera, color: 'bg-amber-600', show: true },
                ].filter(t => t.show).map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => navigate('/inventory/' + INTERNAL_TO_SUB_TAB_SEGMENT[tab.id])} className={`chip-nav-item ${isActive ? `${tab.color} text-white shadow-lg` : 'text-gray-600'}`}>
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {activeTab === 'inventory' ? (
            <ProductsList 
              appProducts={products} categories={categories} suppliers={suppliers} isAdmin={isAdmin} canManageStock={canManageStock} canEditProduct={canEditProduct} profile={profile}
              setEditingProduct={setEditingProduct} setShowProductModal={setShowProductModal} handleEditProduct={(p) => setDetailProduct(p)}
              setShowBarcodeGenerator={setShowBarcodeGenerator} showBarcodeGenerator={showBarcodeGenerator}
            />
          ) : activeTab === 'purchase_orders' ? (
            canManagePO ? <PurchaseOrderSystem /> : <div className="p-20 text-center uppercase font-black text-gray-600">Access Denied</div>
          ) : activeTab === 'purchases' ? (
            canViewRecords ? <PurchaseHistory /> : <div className="p-20 text-center uppercase font-black text-gray-600">Access Denied</div>
          ) : activeTab === 'bundles' ? (
            <BundleManager />
          ) : activeTab === 'groups' ? (
            <CategoriesList categories={categories} appProducts={products} appSettings={appSettings} setSelectedCategory={(_c) => {}} />
          ) : activeTab === 'suppliers' ? (
            <SupplierManager />
          ) : (
            <MediaLibrary isOpen={true} onClose={() => navigate('/inventory/products')} onSelect={() => {}} standalone={true} />
          )}

          {viewingSale && <ReceiptPrint sale={viewingSale} onClose={() => setViewingSale(null)} />}
        </div>
      )}
      {showBarcodeGenerator && (
        <ProductsList 
          appProducts={products} categories={categories} suppliers={suppliers} isAdmin={isAdmin} canManageStock={canManageStock} canEditProduct={canEditProduct} profile={profile}
          setEditingProduct={setEditingProduct} setShowProductModal={setShowProductModal} handleEditProduct={(p) => setDetailProduct(p)}
          setShowBarcodeGenerator={setShowBarcodeGenerator} showBarcodeGenerator={showBarcodeGenerator}
        />
      )}
    </>
  );
}
