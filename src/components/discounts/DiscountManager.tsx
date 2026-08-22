import { useAppStore, useSettingsStore, useUsersStore } from '../../stores';
import { useState } from 'react';
import { Plus, Edit, Trash2, Percent, Gift } from 'lucide-react';
import { Discount } from '../../types';
import { useApp } from '../../context/SupabaseAppContext';
import { can } from '../../lib/permissions';
import { DiscountModal } from './DiscountModal';
import { sonner } from '../../lib/sonner';
import { formatAppDate } from '../../lib/dateUtils';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { Button, Badge, EmptyState, Pagination, usePagination } from '../../shared/ui';

export function DiscountManager() {
  const appCurrentUser = useUsersStore(s => s.currentUser);
const appDiscounts = useAppStore(s => s.discounts);
const appSettings = useSettingsStore(s => s.settings);
  const canManageDiscounts = can(appCurrentUser?.role, 'manage_discounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  const filteredDiscounts = appDiscounts.filter(discount =>
    discount?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredDiscounts, 20);


  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount);
    setShowDiscountModal(true);
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!canManageDiscounts) { sonner.error('You do not have permission to delete discounts.'); return; }
    const result = await sonner.deleteConfirm('discount');
    if (result.isConfirmed) {
      try {
        sonner.loading('Deleting discount...');
        const { discountsService } = await import('../../lib/services');
        await discountsService.delete(discountId);
        useAppStore.getState().deleteDiscount(discountId);
        sonner.success('Discount deleted successfully!');
      } catch (error) {
        console.error('Error deleting discount:', error);
        sonner.error('Failed to delete discount. Please try again.');
      } finally {
        sonner.close();
      }
    }
  };

  const handleAddDiscount = () => {
    setEditingDiscount(null);
    setShowDiscountModal(true);
  };

  const toggleDiscountStatus = async (discount: Discount) => {
    try {
      sonner.loading(`${discount.active ? 'Deactivating' : 'Activating'} discount...`);
      const updatedDiscount = { ...discount, active: !discount.active };
      const { discountsService } = await import('../../lib/services');
      await discountsService.update(discount.id, updatedDiscount);
      useAppStore.getState().updateDiscount(updatedDiscount);
      sonner.success(`Discount ${discount.active ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error updating discount:', error);
      sonner.error('Failed to update discount. Please try again.');
    } finally {
      sonner.close();
    }
  };

  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
      case 'fixed':
        return <Percent className="h-4 w-4" />;
      default:
        return <Percent className="h-4 w-4" />;
    }
  };

  const getDiscountTypeColor = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'fixed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDiscountTypeTone = (type: string) => {
    switch (type) {
      case 'percentage':
      case 'fixed':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="main-content-scroll p-3 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 xl:gap-10">
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner border border-primary/10">
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="shrink-0 flex flex-col">
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{"Discounts"}</h1>
              <p className="hidden sm:block text-gray-600 dark:text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">{"Promotional Offers"}</p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleAddDiscount}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          <span>{"Add Discount"}</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="relative z-20 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-700">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Total Discounts"}</span>
            <span className="stat-card-value">{appDiscounts.length}</span>
          </div>
          <Percent className="stat-card-icon h-10 w-10 text-white" />
        </div>

        <div className="stat-card bg-gradient-to-br from-green-500 to-emerald-600">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Active Discounts"}</span>
            <span className="stat-card-value">{appDiscounts.filter(d => d.active).length}</span>
          </div>
          <Gift className="stat-card-icon h-10 w-10 text-white" />
        </div>

        <div className="stat-card bg-gradient-to-br from-purple-500 to-fuchsia-700">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Percentage Offers"}</span>
            <span className="stat-card-value">{appDiscounts.filter(d => d.type === 'percentage').length}</span>
          </div>
          <Percent className="stat-card-icon h-10 w-10 text-white" />
        </div>

        <div className="stat-card bg-gradient-to-br from-orange-500 to-rose-600">
          <div className="stat-card-inner">
            <span className="stat-card-label">{"Fixed Offers"}</span>
            <span className="stat-card-value">{appDiscounts.filter(d => d.type === 'fixed').length}</span>
          </div>
          <Percent className="stat-card-icon h-10 w-10 text-white" />
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 gap-4">
          <div className="flex-1 max-w-md">
            <SharedSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={"Search discounts..."}
            />
          </div>
        </div>
      </div>

      {/* Discounts Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
              <tr>
                <th className="table-header-cell">{"Discount"}</th>
                <th className="table-header-cell hidden sm:table-cell">{"Type"}</th>
                <th className="table-header-cell">{"Value"}</th>
                <th className="table-header-cell hidden md:table-cell">{"Conditions"}</th>
                <th className="table-header-cell hidden lg:table-cell">{"Valid Period"}</th>
                <th className="table-header-cell hidden sm:table-cell">{"Status"}</th>
                <th className="table-header-cell text-right">{"Actions"}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface divide-y divide-gray-200 dark:divide-white/5">
              {filteredDiscounts.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Gift className="h-12 w-12" />}
                      title={"No discounts found"}
                      subtext={"Create your first promotional offer"}
                    />
                  </td>
                </tr>
              )}
              {pageItems.map((discount) => (
                <tr key={discount.id} className="table-row">
                  <td className="table-cell" data-label="Discount">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{discount.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{discount.description}</div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell" data-label="Type">
                    <Badge tone={getDiscountTypeTone(discount.type) as 'success' | 'info' | 'neutral'} className={`${getDiscountTypeColor(discount.type)} capitalize !text-xs !px-3 !font-medium`}>
                      {getDiscountTypeIcon(discount.type)}
                      <span>{discount.type.replace('_', ' ')}</span>
                    </Badge>
                  </td>
                  <td className="table-cell font-semibold" data-label="Value">
                    {discount.type === 'percentage' && `${discount.value}%`}
                    {discount.type === 'fixed' && `${appSettings.currency} ${discount.value}`}
                  </td>
                  <td className="table-cell hidden md:table-cell" data-label="Conditions">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {discount.conditions.length} condition(s)
                    </div>
                  </td>
                  <td className="table-cell text-gray-900 dark:text-gray-300 hidden lg:table-cell" data-label="Valid Period">
                    <div className="text-xs">
                      <div>{formatAppDate(discount.validFrom, appSettings.country)}</div>
                      <div className="text-gray-600 dark:text-gray-400">to {formatAppDate(discount.validTo, appSettings.country)}</div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell" data-label="Status">
                    <button
                      onClick={() => toggleDiscountStatus(discount)}
                      className={`badge ${discount.active ? 'badge-emerald' : 'badge-danger'
                        } cursor-pointer hover:opacity-80`}
                    >
                      {discount.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleEditDiscount(discount)}
                        className="!min-h-0 !p-2 !rounded-lg !text-primary dark:!text-emerald-400 hover:!text-emerald-900 dark:hover:!text-emerald-300 hover:!bg-emerald-50 dark:hover:!bg-emerald-900/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteDiscount(discount.id)}
                        disabled={!canManageDiscounts}
                        className="!min-h-0 !p-2 !rounded-lg !text-red-600 hover:!text-red-900 hover:!bg-red-50 disabled:!opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        
          <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/5 flex justify-center">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={filteredDiscounts.length}
              mode="numbered"
            
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        
      </div>

      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        discount={editingDiscount}
      />
    </div>
  );
}