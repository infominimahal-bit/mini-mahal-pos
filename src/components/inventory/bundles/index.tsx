import { useAppStore, useProductsStore, useSettingsStore } from '../../../stores';
import { useState, useEffect } from 'react';
import { Plus, Gift } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Bundle, Product } from '../../../types';
import { sonner } from '../../../lib/sonner';
import { bundlesService } from '../../../lib/services';
import { Button, EmptyState } from '../../../shared/ui';
import { BundleForm } from './BundleForm';
import { BundleCard } from './BundleCard';

export function BundleManager() {
  const appSettings = useSettingsStore(s => s.settings);
  const appProducts = useProductsStore(s => s.products);
  const appBundles = useAppStore(s => s.bundles);

  const { profile } = useAuth();
  const isAdmin = true; // Role logic removed — full access
  const isManager = true;
  const canManage = isAdmin || isManager;

  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);
  const [actionMenuBundleId, setActionMenuBundleId] = useState<string | null>(null);
  const [menuUpward, setMenuUpward] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const bundles = appBundles || [];

  // Auto-detect deal categories from bundles
  const dealCategories = ['all', ...Array.from(new Set(bundles.map(b => (b as any).dealCategory).filter(Boolean)))] as string[];

  const formatCatLabel = (cat: string) => {
    if (cat === 'all') return 'All';
    return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatSectionLabel = (cat: string) => {
    return `${formatCatLabel(cat)} Deals`;
  };

  // Reset activeCategory if its count drops to zero (e.g. after delete)
  useEffect(() => {
    if (activeCategory !== 'all') {
      const count = bundles.filter(b => (b as any).dealCategory === activeCategory).length;
      if (count === 0) setActiveCategory('all');
    }
  }, [bundles, activeCategory]);

  const openCreate = () => {
    setEditingBundle(null);
    setShowForm(true);
  };

  const openEdit = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBundle(null);
  };

  const handleDelete = async (bundle: Bundle) => {
    const title = "Delete Bundle?";
    const desc = "\"{name}\" bundle will be permanently deleted.".replace('{name}', bundle.name);
    const result = await sonner.confirm(title, desc);
    if (!result.isConfirmed) return;
    try {
      await bundlesService.delete(bundle.id);
      useAppStore.getState().deleteBundle(bundle.id);
      sonner.success("Bundle deleted");
    } catch (err: any) {
      sonner.error(err.message || "Error deleting bundle");
    }
  };

  const handleToggleActive = async (bundle: Bundle) => {
    try {
      await bundlesService.update(bundle.id, { active: !bundle.active });
      useAppStore.getState().updateBundle({ ...bundle, active: !bundle.active, updatedAt: new Date() },);
      sonner.success(bundle.active ? "Bundle disabled" : "Bundle enabled");
    } catch (err: any) {
      sonner.error("Error updating status");
    }
  };

  return (
    <>
      {/* ─── FORM MODE ─── */}
      {showForm && (
        <BundleForm
          editingBundle={editingBundle}
          products={appProducts}
          appSettings={appSettings}
          onClose={closeForm}
        />
      )}

      {/* ─── LIST MODE (always mounted, hidden when form is open) ─── */}
      {!showForm && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{"Bundles & Deals"}</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {"{count} bundles · Access from \"Bundles\" chip in POS".replace('{count}', String(bundles.length))}
              </p>
            </div>
            {canManage && (
              <Button
                size="md"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={openCreate}
              >
                {"Create Bundle"}
              </Button>
            )}
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
            <Gift className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
              {"In POS ProductGrid, you will see a 🎁 Bundles chip under category chips. Click it → click \"Add Bundle\" → all items will be added to the cart with prorated discounts."}
            </p>
          </div>

          {/* Bundle List */}
          {bundles.length === 0 ? (
            <EmptyState
              icon={<Gift className="h-8 w-8 text-primary" />}
              title={"No Bundles & Deals Yet"}
              subtext={"Create your first bundle deal to start selling combos."}
              className="py-16 bg-white dark:bg-surface rounded-3xl border border-gray-200 dark:border-white/5"
              action={canManage && (
                <Button size="md" onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                  {"Create Bundle"}
                </Button>
              )}
            />
          ) : (
            <div className="space-y-6">
              {/* Category filter tabs — auto-detected from bundle dealCategory values */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap md:flex-wrap pb-1">
                {dealCategories.map(cat => {
                  const count = cat === 'all' ? bundles.length : bundles.filter(b => (b as any).dealCategory === cat).length;
                  if (cat !== 'all' && count === 0) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        activeCategory === cat
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {formatCatLabel(cat)} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Grouped bundles */}
              {dealCategories.filter(c => c !== 'all').map(cat => {
                const catBundles = bundles.filter(b => (b as any).dealCategory === cat);
                if (catBundles.length === 0) return null;
                if (activeCategory !== 'all' && activeCategory !== cat) return null;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-5 w-1 rounded-full bg-primary" />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                        {formatSectionLabel(cat)}
                      </h3>
                      <span className="text-[9px] text-gray-400 font-medium">({catBundles.length})</span>
                    </div>
                    <div className="space-y-3">
                      {catBundles.map(bundle => (
                        <BundleCard
                          key={bundle.id}
                          bundle={bundle}
                          products={appProducts}
                          appSettings={appSettings}
                          isExpanded={expandedBundle === bundle.id}
                          onToggleExpand={() => setExpandedBundle(expandedBundle === bundle.id ? null : bundle.id)}
                          canManage={canManage}
                          onEdit={() => openEdit(bundle)}
                          onToggleActive={() => handleToggleActive(bundle)}
                          onDelete={() => handleDelete(bundle)}
                          actionMenuOpen={actionMenuBundleId === bundle.id}
                          menuUpward={menuUpward}
                          onToggleMenu={(bundleId, e) => {
                            const isOpen = actionMenuBundleId === bundleId;
                            if (!isOpen) {
                              const btn = e.currentTarget.getBoundingClientRect();
                              setMenuUpward(window.innerHeight - btn.bottom < 220);
                            }
                            setActionMenuBundleId(isOpen ? null : bundleId);
                          }}
                          onCloseMenu={() => { setActionMenuBundleId(null); setMenuUpward(false); }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default BundleManager;
