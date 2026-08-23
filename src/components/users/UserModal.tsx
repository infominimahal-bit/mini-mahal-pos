import React, { useState } from 'react';
import { User, Lock, Shield, Crown, Loader2, Camera, Save, Tag, CreditCard, Package, Edit, Trash2, Database, ClipboardList, History, Wallet, Users, BarChart3, Eye, EyeOff } from 'lucide-react';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { User as UserType } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { cn } from '../../lib/utils';
import { MediaLibrary } from '../../shared/MediaLibrary';
import { Button, ToggleSwitch } from '../../shared/ui';
import { useUserModalData } from './useUserModalData';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserType | null;
}

export function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    appCurrentUser, loading, formData, setFormData,
    showMediaLibrary, setShowMediaLibrary, handleSubmit, handleChange,
    toggleAccessPerm, t
  } = useUserModalData(user, onClose);

  if (!isOpen) return null;

  const footer = (
    <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        className="!min-h-0 !px-4 sm:!px-6 !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[10px] !font-black !text-[#ff4b6e] !border !border-rose-200 dark:!border-rose-900/30 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 !shrink-0"
      >
        {t('discard_upper', 'DISCARD')}
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={handleSubmit}
        disabled={loading}
        className="!flex-1 sm:!flex-none sm:!min-w-[240px] !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[11px]"
      >
        {loading ? <Loader2 className="w-4 h-4 sm:h-5 sm:w-5 animate-spin shrink-0" /> : <Save className="w-4 h-4 sm:h-5 sm:w-5 shrink-0" />}
        <span className="leading-none ml-2">
          {user ? t('commit_changes', 'COMMIT CHANGES') : t('register_operator', 'REGISTER OPERATOR')}
        </span>
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? t('edit_operator', 'EDIT OPERATOR') : t('register_new_operator', 'REGISTER NEW OPERATOR')}
      maxWidth="lg"
      footer={footer}
    >
      <div className="space-y-10">
        {/* Identity & Biometrics */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {t('identity_biometrics', 'Identity & Biometrics')}
          </h3>
          
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div
                onClick={() => setShowMediaLibrary(true)}
                className="h-20 w-20 bg-gray-50 dark:bg-black/75 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm transition-all group-hover:border-primary/30 cursor-pointer"
              >
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-gray-600" />
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowMediaLibrary(true)}
                aria-label="Upload avatar"
                className="!absolute !-bottom-2 !-right-2 !min-h-0 !p-2 !rounded-xl !bg-white dark:!bg-zinc-800 !text-primary !shadow-lg !border !border-gray-200 dark:!border-white/10 hover:!scale-110 active:!scale-90"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-wider">{t('system_avatar', 'System Avatar')}</p>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{t('authorized_visual_token', 'Authorized Visual Token')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('full_legal_name', 'Full Legal Name *')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder="e.g. Michael Chen"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('username_label', 'Username *')}</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={!!user}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium disabled:opacity-50"
                placeholder="m.chen"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('email_address_optional', 'Email Address (Optional)')}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                placeholder="m.chen@local.com"
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('security_key_password', 'Security Key (Password)')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!user}
                  className="w-full pl-12 pr-12 bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  placeholder={user ? t('leave_blank_keep_current', 'Leave blank to keep current') : t('min_6_chars', 'Min 6 characters')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-emerald-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Authority & Privileges */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {t('operational_authority', 'Operational Authority')}
          </h3>
          <SearchableSelect
            label={t('select_role', 'SELECT ROLE')}
            options={[
              { id: 'admin', label: t('full_administrator', 'FULL ADMINISTRATOR') },
              { id: 'manager', label: t('operations_manager', 'OPERATIONS MANAGER') },
              { id: 'cashier', label: t('terminal_operator', 'TERMINAL OPERATOR') }
            ]}
            value={formData.role}
            onChange={(val) => setFormData(prev => ({ ...prev, role: val as any }))}
            icon={Shield}
            disabled={user?.id === appCurrentUser?.id}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'canEditPrice', label: t('price_override', 'PRICE OVERRIDE'), icon: Tag },
              { key: 'canGiveDiscount', label: t('issue_discounts', 'ISSUE DISCOUNTS'), icon: CreditCard },
              { key: 'canEditSale', label: t('edit_sales', 'EDIT SALES'), icon: Edit },
              { key: 'canDeleteSale', label: t('delete_sales', 'DELETE SALES'), icon: Trash2 },
              { key: 'canManageStock', label: t('inventory_hub', 'INVENTORY HUB'), icon: Database },
              { key: 'canManagePO', label: t('restock_po', 'RESTOCK (PO)'), icon: ClipboardList },
              { key: 'canViewRecords', label: t('purchase_history', 'PURCHASE HISTORY'), icon: History },
              { key: 'canViewProfit', label: t('revenue_audit', 'REVENUE AUDIT'), icon: Crown, managerOnly: true },
            ].map((perm) => (
              (!perm.managerOnly || formData.role !== 'cashier') && 
              ((perm.key !== 'canEditSale' && perm.key !== 'canDeleteSale') || formData.role !== 'cashier') && (
                <div key={perm.key} className={cn(
                  "flex items-center justify-between p-4 rounded-[20px] border transition-all",
                  formData.role === 'admin' || (formData as any)[perm.key] 
                    ? 'bg-emerald-50 dark:bg-primary/5 border-emerald-100 dark:border-primary/20' 
                    : 'bg-[#f8f9fa] dark:bg-black/20 border-gray-200 dark:border-white/5'
                )}>
                  <div className="flex items-center gap-3">
                    <perm.icon className={cn(
                      "h-4 w-4",
                      formData.role === 'admin' || (formData as any)[perm.key] ? 'text-primary' : 'text-gray-600'
                    )} />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      formData.role === 'admin' || (formData as any)[perm.key] ? 'text-primary dark:text-emerald-400' : 'text-gray-600'
                    )}>{perm.label}</span>
                  </div>
                  <ToggleSwitch
                    checked={formData.role === 'admin' || (formData as any)[perm.key]}
                    onChange={(checked) => setFormData(prev => ({ ...prev, [perm.key]: checked }))}
                    disabled={formData.role === 'admin'}
                    size="sm"
                    color="bg-primary"
                  />
                </div>
              )
            ))}
          </div>

          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3 pt-4">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {t('module_access_control', 'Module Access Control')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'access_inventory', label: t('inventory_module', 'INVENTORY MODULE'), icon: Package },
              { key: 'access_expenses', label: t('expenses_module', 'EXPENSES MODULE'), icon: Wallet },
              { key: 'access_payments', label: t('payments_module', 'PAYMENTS MODULE'), icon: CreditCard },
              { key: 'access_customers', label: t('customers_module', 'CUSTOMERS MODULE'), icon: Users },
              { key: 'access_reports', label: t('reports_module', 'REPORTS MODULE'), icon: BarChart3 }
            ].map((mod) => (
              <div key={mod.key} className={cn(
                "flex items-center justify-between p-4 rounded-[20px] border transition-all",
                formData.role === 'admin' || formData.permissions.includes(mod.key)
                  ? 'bg-blue-50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20'
                  : 'bg-[#f8f9fa] dark:bg-black/20 border-gray-200 dark:border-white/5'
              )}>
                <div className="flex items-center gap-3">
                  <mod.icon className={cn(
                    "h-4 w-4",
                    formData.role === 'admin' || formData.permissions.includes(mod.key) ? 'text-blue-500' : 'text-gray-600'
                  )} />
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    formData.role === 'admin' || formData.permissions.includes(mod.key) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600'
                  )}>{mod.label}</span>
                </div>
                <ToggleSwitch
                  checked={formData.role === 'admin' || formData.permissions.includes(mod.key)}
                  onChange={(checked) => toggleAccessPerm(mod.key, checked)}
                  disabled={formData.role === 'admin'}
                  size="sm"
                  color="bg-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Access Protocol */}
        <div className="p-5 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 rounded-[24px] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">{t('system_status', 'System Status')}</span>
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">{t('authorized_locked', 'Authorized / Locked')}</span>
          </div>
          <ToggleSwitch
            checked={formData.active}
            onChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            disabled={user?.id === appCurrentUser?.id}
            size="md"
            color="bg-rose-500"
            className="!scale-110"
          />
        </div>
      </div>
      {showMediaLibrary && (
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={(url) => setFormData(prev => ({ ...prev, avatar: url }))}
        />
      )}
    </Modal>
  );
}
