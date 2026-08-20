import { supabase } from '../lib/supabase'
import { sonner } from '../lib/sonner'
import { AuthMethodDeps } from './context'

export async function signOutImpl(deps: AuthMethodDeps) {
  deps.setLoading(true);
  try {
    await supabase.auth.signOut();
  } catch (error: any) {
    console.warn('Network error during sign out, gracefully logging out locally:', error);
  } finally {
    localStorage.removeItem('pos_session_start');
    localStorage.removeItem('pos_offline_profile');

    localStorage.removeItem('zaynahs-pos-auth');
    localStorage.removeItem('zaynahs-pos-admin-auth');

    const storageKeys = Object.keys(localStorage);
    storageKeys.forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });

    deps.setSession(null);
    deps.setUser(null);
    deps.setProfile(null);
    deps.setLoading(false);

    sonner.dismissAll();
    sonner.success('Signed Out! You have been successfully signed out.');
  }
}
