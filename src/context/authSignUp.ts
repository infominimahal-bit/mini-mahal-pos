import { supabase } from '../lib/supabase'
import { User } from '../types'
import { can } from '../lib/permissions'
import { sonner } from '../lib/sonner'
import { localDb } from '../lib/localDb'
import { hashPasswordString, getAuthErrorMessage } from '../lib/authUtils'

interface SignUpDeps {
  setLoading: any
  setProfile: any
}

export function createSignUp(deps: SignUpDeps) {
  const { setLoading, setProfile } = deps

  return async function signUp(email: string, password: string, name: string, username: string) {
    setLoading(true);
    try {
      // ── Step 1: Create Auth User ─────────────────────────────────────────
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, username } }
      });

      // Real auth errors (not "email already exists" which Supabase handles silently)
      if (error) throw error;

      // ── Step 2: Email Confirmation Required ──────────────────────────────
      // When email confirmation is ON, session is null but user is created.
      // Show success, don't create profile yet (trigger handles it on confirm).
      if (data.user && !data.session) {
        setLoading(false);
        sonner.success(
          'Account created! ✅ Please check your email and click the confirmation link to activate your account.'
        );
        return; // Profile will be created after email confirmation via trigger/webhook
      }

      // ── Step 3: Immediate session (no email confirm needed) ─────────────
      if (data.user) {
        // §2.1.1 MASTER: first user in the system becomes admin (fail-closed).
        // Query public.users (not auth.users) so the trigger row is checked.
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        const isFirstUser = (count ?? 1) === 0;
        const userRole = isFirstUser ? 'admin' : 'cashier';

        const profilePayload: any = {
          id: data.user.id,
          username,
          name,
          email,
          role: userRole,
          permissions: isFirstUser
            ? ['pos_access', 'view_reports', 'manage_inventory', 'manage_users', 'manage_settings']
            : ['pos_access', 'view_reports'],
          can_edit_price: isFirstUser,
          can_give_discount: true,
          can_delete_sale: isFirstUser,
          can_view_profit: isFirstUser,
          can_manage_stock: false,
          can_manage_po: false,
          can_view_records: true,
          active: true,
        };

        // ── Step 4: Upsert profile (handles duplicate key gracefully) ──────
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .upsert(profilePayload, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (profileError) {
          // Not a hard failure — auth succeeded, profile may already exist
          console.warn('[Auth] Profile upsert warning (non-fatal):', profileError);
        }

        // ── Step 5: Cache offline credentials ────────────────────────────
        const pData = profileData || profilePayload;
        try {
          const hash = await hashPasswordString(password);
          localStorage.setItem(`offline_hash_${email}`, hash);
          (pData as any).offlineHash = hash;
          await localDb.users.put(pData);
        } catch (e) {
          console.warn('[Auth] Failed to cache offline credentials:', e);
        }

        // ── Step 6: Set profile in state ──────────────────────────────────
        if (pData) {
          setProfile({
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
            active: pData.active ?? true,
            lastLogin: pData.last_login ? new Date(pData.last_login) : undefined,
            avatar: pData.avatar || undefined,
          });
          localStorage.setItem('pos_offline_profile', JSON.stringify(pData));
        }
        setLoading(false);
        sonner.success('Welcome! ✅ Account created successfully as Admin.');
        localStorage.setItem('pos_session_start', new Date().toISOString());
      }

      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      // Translate to user-friendly messages
      const msg = error.message || error.toString();
      if (msg.includes('User already registered') || msg.includes('already been registered')) {
        sonner.error('This email is already registered. Please sign in instead.');
      } else if (msg.toLowerCase().includes('email')) {
        sonner.error('Please enter a valid email address.');
      } else {
        sonner.error(`Sign Up Failed: ${getAuthErrorMessage(msg)}`);
      }
      throw error;
    }
  }
}
