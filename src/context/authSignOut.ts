import { supabase } from '../lib/supabase'
import { sonner } from '../lib/sonner'

interface SignOutDeps {
  setSession: any
  setUser: any
  setProfile: any
  setLoading: any
}

export function createSignOut(deps: SignOutDeps) {
  const { setSession, setUser, setProfile, setLoading } = deps

  return async function signOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.warn('Network error during sign out, gracefully logging out locally:', error);
    } finally {
      // Always clear and redirect — works offline too
      localStorage.removeItem('pos_session_start');
      localStorage.removeItem('pos_offline_profile');

      // Clear Supabase's local auth token to ensure session is destroyed offline
      // NOTE: legacy 'zaynahs-pos-auth' key names are PRESERVED — renaming would
      // strand existing sessions on upgrades. Persistence keys are not branding.
      localStorage.removeItem('zaynahs-pos-auth');
      localStorage.removeItem('zaynahs-pos-admin-auth');

      const storageKeys = Object.keys(localStorage);
      storageKeys.forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });

      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);

      // Dismiss all previous notifications and show sign-out success
      sonner.dismissAll();
      sonner.success('Signed Out! You have been successfully signed out.');
    }
  }
}
