import { supabase, enableFullAuthInit } from '../../lib/supabase'
import { User } from '../../types'
import { can } from '../../lib/permissions'
import { sonner } from '../../lib/sonner'
import { localDb } from '../../lib/localDb'
import { AuthMethodDeps } from './context'
import { signOutImpl } from './signOut'

export async function loadProfileImpl(userId: string, deps: AuthMethodDeps) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error

    if (data) {
      if (data.active === false) {
        await signOutImpl(deps);
        sonner.error('Your account has been deactivated by an administrator.');
        return;
      }

      const pData = data as any;
      const profileData: User = {
        id: pData.id,
        username: pData.username,
        name: pData.name,
        email: pData.email,
        role: pData.role as any,
        permissions: pData.permissions || [],
        canEditPrice: can(pData.role, 'edit_price'),
        canGiveDiscount: can(pData.role, 'give_discount'),
        canDeleteSale: can(pData.role, 'delete_sale'),
        canViewProfit: can(pData.role, 'view_profit'),
        canManageStock: can(pData.role, 'manage_stock'),
        canManagePO: can(pData.role, 'manage_po'),
        canViewRecords: can(pData.role, 'view_records'),
        canEditSale: can(pData.role, 'edit_sale'),
        active: pData.active ?? true,
        lastLogin: pData.last_login ? new Date(pData.last_login) : undefined,
        avatar: pData.avatar || undefined,
        offlineHash: (pData as any).offline_hash ?? (pData as any).offlineHash,
      };

      deps.setProfile(profileData);
      localStorage.setItem('pos_offline_profile', JSON.stringify(profileData));
      localDb.users.put(profileData).catch(() => { });
      enableFullAuthInit();
    } else {
      if (navigator.onLine) {
        console.warn(`[Auth] User ${userId} not found on server. Forcing logout.`);
        await signOutImpl(deps);
        sonner.error('Session Invalid', 'Your account no longer exists. Please sign in again.');
      } else {
        const cached = localStorage.getItem('pos_offline_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          deps.setProfile(parsed);
        }
      }
    }
  } catch (error: any) {
    console.error('Error loading profile:', error)

    const isOfflineError = !navigator.onLine || error?.toString().includes('Failed to fetch');
    if (isOfflineError) {
      const cached = localStorage.getItem('pos_offline_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.lastLogin) parsed.lastLogin = new Date(parsed.lastLogin);
          console.log('Restored profile from offline cache.');
          deps.setProfile(parsed);
          deps.setUser({ id: parsed.id, email: parsed.email } as any);
          return;
        } catch (e) {
          console.error('Failed to parse offline profile cache.');
        }
      }
    }

    const isNetworkError = !navigator.onLine || error?.toString().includes('Failed to fetch') || error?.toString().includes('ERR_NAME_NOT_RESOLVED');
    if (!isNetworkError) {
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData?.user) {
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (!retryError && retryData) {
            const pData = retryData as any;
            const profileData: User = {
              id: pData.id, username: pData.username, name: pData.name, email: pData.email,
              role: pData.role as any, permissions: pData.permissions || [],
              canEditPrice: can(pData.role, 'edit_price'), canGiveDiscount: !!pData.can_give_discount,
              canDeleteSale: can(pData.role, 'delete_sale'), canViewProfit: !!pData.can_view_profit,
              canManageStock: can(pData.role, 'manage_stock'), canManagePO: !!pData.can_manage_po,
              canViewRecords: can(pData.role, 'view_records'), canEditSale: !!pData.can_edit_sale,
              active: pData.active ?? true, lastLogin: pData.last_login ? new Date(pData.last_login) : undefined,
              avatar: pData.avatar || undefined,
              offlineHash: (pData as any).offline_hash ?? (pData as any).offlineHash,
            };
            deps.setProfile(profileData);
            localStorage.setItem('pos_offline_profile', JSON.stringify(profileData));
            return;
          }
        }
      } catch (_) {
      }
    }

    if (isNetworkError) {
      const cached = localStorage.getItem('pos_offline_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.lastLogin) parsed.lastLogin = new Date(parsed.lastLogin);
          console.log('[Auth] Offline — using cached profile silently.');
          deps.setProfile(parsed);
          deps.setUser({ id: parsed.id, email: parsed.email } as any);
          return;
        } catch (e) { }
      }
      console.warn('[Auth] Offline and no cached profile available.');
      return;
    }

    sonner.error('Failed to load user profile. Please try logging in again.');
  } finally {
    deps.setLoading(false)
  }
}
