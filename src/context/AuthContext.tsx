import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase, enableFullAuthInit } from '../lib/supabase'
import { User } from '../types'
import { usersService } from '../lib/services'
import { sonner } from '../lib/sonner'
import { signInLogic, signUpLogic, signOutLogic, loadProfileLogic } from './authOperations'

interface AuthContextType {
  user: SupabaseUser | null
  profile: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshProfile: () => Promise<void>
  isRecoveringPassword: boolean
  setIsRecoveringPassword: (value: boolean) => void
}
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export { hashPasswordString } from '../lib/authUtils'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false)

  useEffect(() => {
    const checkSessionExpiry = () => {
      const loginTimestamp = localStorage.getItem('pos_session_start');
      if (!loginTimestamp) return;

      const loginDate = new Date(loginTimestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);

      if (hoursDiff >= 24) {
        localStorage.removeItem('pos_session_start');
        localStorage.removeItem('pos_actor_profile');
        supabase.auth.signOut();
        sonner.error('Your session has expired (24 hours). Please sign in again.');
      }
    };

    checkSessionExpiry();
    const expiryTimer = setInterval(checkSessionExpiry, 60_000);

    // PHASE 39A: real-time block/delete enforcement for ALREADY-LOGGED-IN users.
    // Polls the cached flag locally and (when online) the server, force-logging
    // out immediately if the account was blocked/removed after login.
    const forceLogout = async (reason: string) => {
      localStorage.removeItem('pos_actor_profile');
      localStorage.removeItem('pos_session_start');
      try { await supabase.auth.signOut(); } catch (_e) { /* ignore */ }
      setProfile(null);
      setUser(null);
      setSession(null);
      sonner.error(reason);
    };

    const verifyActiveStatus = async () => {
      if (!navigator.onLine) return;
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id;
        if (!uid) return;
        const { data: prof, error } = await supabase
          .from('users')
          .select('active, deleted_at')
          .eq('id', uid)
          .single();
        if (!error && prof && (prof.active === false || prof.deleted_at != null)) {
          forceLogout('Your account has been deactivated. You have been logged out.');
        }
      } catch (_e) { /* network error: never sign out on network failure (GEMINI rule) */ }
    };

    const activeTimer = setInterval(verifyActiveStatus, 30_000);

    (supabase.auth as any)._initCalled = true;
    supabase.auth.stopAutoRefresh?.().catch(() => { });

    const initSession = async () => {
      try {
        const { data: { session: storedSession } } = await supabase.auth.getSession();
        setSession(storedSession ?? null);
        setUser(storedSession?.user ?? null);
        
        if (storedSession?.access_token) {
          try { supabase.realtime.setAuth(storedSession.access_token); } catch { /* noop */ }
        }

        if (storedSession?.user) {
          await loadProfileLogic(storedSession.user.id, setProfile, setUser, setLoading);
        } else {
          setLoading(false);
        }
      } catch (_err) {
        setLoading(false);
      }
    };
    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Keep the Realtime WebSocket's JWT fresh. Without this the socket holds a
      // stale token; the server CLOSES the channel when it expires (~1h) and the
      // client reconnects with the same dead token → endless CLOSED→retry loop
      // (and multi-device sync silently dies). setAuth pushes the new token to
      // the socket on SIGNED_IN / TOKEN_REFRESHED.
      if (session?.access_token) {
        try { supabase.realtime.setAuth(session.access_token); } catch { /* noop */ }
      }

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }

      if (!session?.user) {
        setProfile(null)
        setLoading(false)
      }

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfileLogic(session.user.id, setProfile, setUser, setLoading)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    const handleOnline = () => {
      enableFullAuthInit();
    };
    const handleOffline = () => {
      supabase.auth.stopAutoRefresh?.().catch(() => { });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      enableFullAuthInit();
    }

    return () => {
      subscription.unsubscribe();
      clearInterval(expiryTimer);
      clearInterval(activeTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [])


  async function signIn(identifier: string, password: string) {
    await signInLogic(identifier, password, setLoading, setProfile, setUser);
  }

  async function signUp(email: string, password: string, name: string, username: string) {
    await signUpLogic(email, password, name, username, setLoading, setProfile);
  }

  async function signOut() {
    await signOutLogic(setLoading, setSession, setUser, setProfile);
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error('No user logged in')

    const updatedProfile = await usersService.update(user.id, updates)
    setProfile(updatedProfile)
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  async function refreshProfile() {
    if (user?.id) {
      await loadProfileLogic(user.id, setProfile, setUser, setLoading);
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updatePassword,
    refreshProfile,
    isRecoveringPassword,
    setIsRecoveringPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      user: null,
      profile: null,
      session: null,
      loading: false,
      isRecoveringPassword: false,
      setIsRecoveringPassword: () => { },
      signIn: async () => { throw new Error('Auth not ready'); },
      signUp: async () => { },
      signOut: async () => { },
      updateProfile: async () => { },
      updatePassword: async () => { },
      refreshProfile: async () => { }
    };
  }
  return context;
}
