import { supabase } from '../../lib/supabase';
import { sonner } from '../../lib/sonner';

export async function signOutLogic(setLoading: any, setSession: any, setUser: any, setProfile: any) {
  setLoading(true);
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

    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);

    sonner.dismissAll();
    sonner.success('Signed Out! You have been successfully signed out.');
  }
}
