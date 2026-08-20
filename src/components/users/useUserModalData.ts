import { useUsersStore } from '../../stores';
import { useState, useEffect } from 'react';
import { User, Lock, Shield, Crown, Loader2, Camera, Save, Tag, CreditCard, Package, Edit, Trash2, Database, ClipboardList, History, Wallet, Users, BarChart3 } from 'lucide-react';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { User as UserType } from '../../types';
import { useApp } from '../../context/SupabaseAppContext';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../lib/services';
import { supabase, adminUserAction } from '../../lib/supabase';
import { sonner } from '../../lib/sonner';
import { hashPasswordString } from '../../context/AuthContext';
import { Modal } from '../../shared/ui/Modal';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { MediaLibrary } from '../../shared/MediaLibrary';
import { Button, ToggleSwitch } from '../../shared/ui';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserType | null;
}

export function useUserModalData(user: UserType | null | undefined, onClose: () => void) {
  const appCurrentUser = useUsersStore(s => s.currentUser);
const appUsers = useUsersStore(s => s.users);

  const { refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'cashier' as const,
    active: true,
    avatar: '',
    canEditPrice: false,
    canGiveDiscount: true,
    canDeleteSale: false,
    canViewProfit: false,
    canManageStock: false,
    canManagePO: false,
    canViewRecords: false,
    canEditSale: false,
    permissions: [] as string[]
  });
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        name: user.name,
        email: user.email,
        password: '', // Don't pre-fill password for existing users
        role: user.role,
        active: user.active,
        avatar: user.avatar || '',
        canEditPrice: user.canEditPrice,
        canGiveDiscount: user.canGiveDiscount,
        canDeleteSale: user.canDeleteSale,
        canViewProfit: user.canViewProfit,
        canManageStock: user.canManageStock,
        canManagePO: user.canManagePO,
        canViewRecords: user.canViewRecords,
        canEditSale: user.canEditSale ?? false,
        permissions: user.permissions || []
      });
    } else {
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        role: 'cashier',
        active: true,
        avatar: '',
        canEditPrice: false,
        canGiveDiscount: true,
        canDeleteSale: false,
        canViewProfit: false,
        canManageStock: false,
        canManagePO: false,
        canViewRecords: false,
        canEditSale: false,
        permissions: [] as string[]
      });
    }
  }, [user]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.username.trim()) {
        sonner.error('Username is required');
        setLoading(false);
        return;
      }

      if (user) {
        // Update logic remains same

        if (formData.password && formData.password.length >= 6) {
          try {
            if (false) throw new Error('Only admins can update user passwords');
            const { error: authError } = await adminUserAction('updateUser', {
              id: user.id,
              updates: { password: formData.password },
            });
            if (authError) throw new Error(authError);
          } catch (adminErr) {
            console.warn('[UserModal] Admin password update failed:', adminErr);
          }

          try {
            const hash = await hashPasswordString(formData.password);
            localStorage.setItem(`offline_hash_${formData.email}`, hash);
            const localU = await localDb.users.get(user.id);
            if (localU) {
              const updatedLocalU = { ...localU, offlineHash: hash };
              await localDb.users.put(updatedLocalU);
            }
            await supabase.from('users').update({ offline_hash: hash }).eq('id', user.id);
          } catch (hashErr) {
            console.warn('Failed to commit local password hash update:', hashErr);
          }
        }

        const updatePayload: Partial<UserType> = {
          username: formData.username,
          name: formData.name,
          email: formData.email,
          role: formData.role as 'cashier',
          active: formData.active,
          avatar: formData.avatar || undefined,
          canEditPrice: true,
          canGiveDiscount: true,
          canDeleteSale: true,
          canViewProfit: true,
          canManageStock: true,
          canManagePO: true,
          canViewRecords: true,
          canEditSale: true,
          permissions: ['access_payments', 'access_expenses', 'access_customers', 'access_reports', 'access_inventory'],
        };

        const updatedUser = await usersService.update(user.id, updatePayload);
        
        // Refresh current user's profile if they are the one being edited
        if (user.id === appCurrentUser?.id) {
          await refreshProfile();
        }

        useUsersStore.getState().setUsers(appUsers.map(u => u.id === user.id ? updatedUser : u));
      } else {
        // Create logic remains same
        if (!formData.password || formData.password.length < 6) {
          sonner.error('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }

        if (false) {
          throw new Error('Permission denied — only admins can create users');
        }

        const normalizedUsername = formData.username.trim().toLowerCase();
        const resolvedEmail = formData.email.trim()
          ? formData.email.trim().toLowerCase()
          : `${normalizedUsername}.${Date.now().toString(36)}@pos.local`;

        const hash = await hashPasswordString(formData.password);
        const { data: authData, error: authError } = await adminUserAction('createUser', {
          email: resolvedEmail,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            username: formData.username,
            full_name: formData.name,
            role: formData.role,
          },
        });

        if (authError) throw new Error(authError);

        const authUser = authData.user;

        await supabase.from('users').upsert({
          id: authUser.id,
          name: formData.name,
          email: resolvedEmail,
          role: formData.role,
          active: formData.active,
          username: formData.username,
          permissions: ['access_payments', 'access_expenses', 'access_customers', 'access_reports', 'access_inventory'],
          can_edit_price: true,
          can_give_discount: true,
          can_delete_sale: true,
          can_view_profit: true,
          can_manage_stock: true,
          can_manage_po: true,
          can_view_records: true,
          can_edit_sale: true,
          avatar: formData.avatar || null,
          offline_hash: hash
        }, { onConflict: 'id' });

        const newUser: UserType = {
          id: authUser.id,
          username: formData.username,
          name: formData.name,
          email: resolvedEmail,
          role: formData.role as 'cashier',
          permissions: ['access_payments', 'access_expenses', 'access_customers', 'access_reports', 'access_inventory'],
          canEditPrice: true,
          canGiveDiscount: true,
          canDeleteSale: true,
          canViewProfit: true,
          canManageStock: true,
          canManagePO: true,
          canViewRecords: true,
          canEditSale: true,
          active: formData.active,
          avatar: formData.avatar || undefined
        };

        useUsersStore.getState().setUsers([...appUsers, newUser]);
      }

      onClose();
    } catch (error) {
      sonner.error(`Error saving user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const toggleAccessPerm = (permStr: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions.filter(p => p !== permStr), permStr]
        : prev.permissions.filter(p => p !== permStr)
    }));
  };



  return {
    appCurrentUser,
    appUsers,
    loading,
    formData,
    setFormData,
    showMediaLibrary,
    setShowMediaLibrary,
    handleSubmit,
    handleChange,
    toggleAccessPerm,
    t,
  };
}
