import { supabase } from '../../lib/supabase';
import { localDb } from '../../lib/localDb';
import { hashPasswordString, getAuthErrorMessage } from '../../lib/authUtils';
import { User } from '../../types';
import { sonner } from '../../lib/sonner';

export async function signInLogic(
  identifier: string,
  password: string,
  setLoading: (l: boolean) => void,
  setProfile: (p: User | null) => void,
  setUser: (u: any) => void
) {
  setLoading(true);
  try {
    const rawIdentifier = String(identifier || '').trim();
    let loginEmail = rawIdentifier;
    const normalizedIdentifier = rawIdentifier.toLowerCase();

    if (!rawIdentifier.includes('@')) {
      console.log(`[Auth] Resolving username: ${rawIdentifier}`);
      try {
        const allLocalUsers = await import('../../lib/localDb').then(m => m.localDb.users.toArray());
        const matchedLocal = allLocalUsers.find(
          u => u.username?.toLowerCase() === normalizedIdentifier || u.email?.toLowerCase() === normalizedIdentifier
        );
        if (matchedLocal?.email && matchedLocal.email.trim() !== '') {
          loginEmail = matchedLocal.email;
        } else {
          loginEmail = `${normalizedIdentifier}@pos.local`;
        }
      } catch (e) {
        loginEmail = `${normalizedIdentifier}@pos.local`;
      }

      if (navigator.onLine) {
        try {
          const { data: rpcEmail, error: rpcError } = await supabase.rpc('resolve_login_email', { p_username: rawIdentifier });
          if (!rpcError && rpcEmail) {
            loginEmail = rpcEmail;
          } else {
            loginEmail = `${normalizedIdentifier}@pos.local`;
          }
        } catch (lookupErr) {
          loginEmail = `${normalizedIdentifier}@pos.local`;
        }
      }
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) throw error;

    const hash = await hashPasswordString(password);
    localStorage.setItem(`offline_hash_${loginEmail}`, hash);

    try {
      if (authData.user) {
        await localDb.users.put({
          id: authData.user.id,
          email: loginEmail,
          name: loginEmail.split('@')[0],
          offlineHash: hash,
          role: 'cashier',
          active: true,
          username: loginEmail.split('@')[0]
        });
        supabase.from('users').update({ offline_hash: hash }).eq('id', authData.user.id).then(() => {});
      }
    } catch (e) {}

    sonner.success('Welcome back! You have successfully signed in.');
    localStorage.setItem('pos_session_start', new Date().toISOString());
  } catch (error: any) {
    const errorStr = error?.toString() || '';
    const isOfflineError = !navigator.onLine || errorStr.includes('Failed to fetch') || errorStr.includes('Load failed') || error.message?.includes('network');
    
    if (isOfflineError) {
      try {
        const lowerIdentifier = identifier.toLowerCase();
        const allLocalUsers = await localDb.users.toArray();
        const matchedUser = allLocalUsers.find(u => u.email?.toLowerCase() === lowerIdentifier || u.username?.toLowerCase() === lowerIdentifier);
        
        if (matchedUser) {
          if (matchedUser.active === false) {
            sonner.error('Account deactivated. Cannot login offline.');
            setLoading(false);
            return;
          }
          const enteredHash = await hashPasswordString(password);
          let storedHash = (matchedUser as any).offlineHash || localStorage.getItem(`offline_hash_${matchedUser.email}`) || localStorage.getItem(`offline_hash_${identifier}`);
          
          if (!storedHash) {
            sonner.error('No offline credentials found. You must login online once to enable offline access.');
            setLoading(false);
            return;
          }
          if (storedHash !== enteredHash) {
            sonner.error('Wrong password. Please try again.');
            setLoading(false);
            return;
          }
          if (!(matchedUser as any).offlineHash && storedHash) {
            try {
              (matchedUser as any).offlineHash = storedHash;
              await localDb.users.put(matchedUser);
            } catch (e) {}
          }

          setProfile(matchedUser as User);
          setUser({ id: matchedUser.id, email: matchedUser.email });
          localStorage.setItem('pos_offline_profile', JSON.stringify(matchedUser));
          localStorage.setItem('pos_session_start', new Date().toISOString());
          setLoading(false);
          sonner.success('Offline Welcome! Logged in using local cache.');
          return;
        } else {
          const cachedProfile = localStorage.getItem('pos_offline_profile');
          if (cachedProfile) {
            try {
              const parsed = JSON.parse(cachedProfile);
              const pEmail = (parsed.email || '').toLowerCase();
              const pUsername = (parsed.username || '').toLowerCase();
              if (pEmail === lowerIdentifier || pUsername === lowerIdentifier) {
                const enteredHash = await hashPasswordString(password);
                const sHash = parsed.offlineHash || localStorage.getItem(`offline_hash_${parsed.email}`);
                if (sHash && sHash === enteredHash) {
                  if (parsed.lastLogin) parsed.lastLogin = new Date(parsed.lastLogin);
                  setProfile(parsed as User);
                  setUser({ id: parsed.id, email: parsed.email });
                  localStorage.setItem('pos_session_start', new Date().toISOString());
                  setLoading(false);
                  sonner.success('Offline Welcome! Logged in from cached profile.');
                  return;
                } else if (!sHash) {
                  sonner.error('No offline credentials found. You must login online once to enable offline access.');
                  setLoading(false);
                  return;
                } else {
                  sonner.error('Wrong password. Please try again.');
                  setLoading(false);
                  return;
                }
              }
            } catch (e) {}
          }
          sonner.error('User not found in local cache. You must login online at least once on this machine.');
          setLoading(false);
          return;
        }
      } catch (localErr) {}
    }
    setLoading(false);
    sonner.error(`Sign In Failed: ${getAuthErrorMessage(error.message || error.toString())}`);
    throw error;
  }
}
