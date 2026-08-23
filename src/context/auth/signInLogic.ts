import { supabase } from '../../lib/supabase';
import { getAuthErrorMessage, hashPasswordString } from '../../lib/authUtils';
import { User } from '../../types';
import { sonner } from '../../lib/sonner';

export async function signInLogic(
  identifier: string,
  password: string,
  setLoading: (l: boolean) => void,
  _setProfile: (p: User | null) => void,
  _setUser: (u: any) => void
) {
  setLoading(true);
  try {
    if (!navigator.onLine) {
      sonner.error('Internet connection required. Please connect to the internet to sign in.');
      setLoading(false);
      return;
    }

    const rawIdentifier = String(identifier || '').trim();
    let loginEmail = rawIdentifier;

    if (!rawIdentifier.includes('@')) {
      const { data: rpcEmail, error: rpcError } = await supabase.rpc('resolve_login_email', { p_username: rawIdentifier });
      if (rpcError || !rpcEmail) {
        sonner.error('Account not found. Please check your username/email.');
        setLoading(false);
        return;
      }
      loginEmail = rpcEmail;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) throw error;

    if (authData.user) {
      const { data: prof } = await supabase.from('users').select('active, deleted_at').eq('id', authData.user.id).single();
      if (prof && (prof.active === false || prof.deleted_at != null)) {
        await supabase.auth.signOut().catch(() => {});
        sonner.error('Account deactivated. Login denied.');
        setLoading(false);
        return;
      }
    }

    sonner.success('Welcome back! You have successfully signed in.');
    localStorage.setItem('pos_session_start', new Date().toISOString());
    const hash = await hashPasswordString(password);
    if (authData.user?.email) {
      localStorage.setItem(`action_hash_${authData.user.email}`, hash);
    }
    if (authData.user) {
      // Heal legacy users by writing the action_hash to their profile on login
      await supabase.from('users').update({ action_hash: hash }).eq('id', authData.user.id);
    }
  } catch (error: any) {
    setLoading(false);
    sonner.error(`Sign In Failed: ${getAuthErrorMessage(error.message || error.toString())}`);
    throw error;
  }
}
