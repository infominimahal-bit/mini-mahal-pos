import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase, enableFullAuthInit } from '../lib/supabase'
import { User } from '../types'
import { usersService } from '../lib/services'
import { sonner } from '../lib/sonner'
import { localDb } from '../lib/localDb'
import { hashPasswordString } from '../lib/authUtils'
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
        localStorage.removeItem('pos_offline_profile');
        supabase.auth.signOut();
        sonner.error('Your session has expired (24 hours). Please sign in again.');
      }
    };

    checkSessionExpiry();
    const expiryTimer = setInterval(checkSessionExpiry, 60_000);

    (supabase.auth as any)._initCalled = true;
    supabase.auth.stopAutoRefresh?.().catch(() => { });

    const AUTH_KEY = 'sb-zaynah-pos-auth-auth-token';
    function readStoredSession(): Session | null {
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as Session;
      } catch { return null; }
    }

    const initSession = () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem('pos_offline_profile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.lastLogin) parsed.lastLogin = new Date(parsed.lastLogin);
            setProfile(parsed);
            setUser({ id: parsed.id, email: parsed.email } as any);
            setLoading(false);
            return;
          } catch (e) {
          }
        }
      }

      const storedSession = readStoredSession();
      setSession(storedSession ?? null);
      setUser(storedSession?.user ?? null);

      if (storedSession?.user) {
        loadProfileLogic(storedSession.user.id, setProfile, setUser, setLoading);
      } else {
        const cached = localStorage.getItem('pos_offline_profile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.lastLogin) parsed.lastLogin = new Date(parsed.lastLogin);
            setProfile(parsed);
            setUser({ id: parsed.id, email: parsed.email } as any);
          } catch (e) { }
        }
        setLoading(false);
      }
    };
    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }

      if (!session?.user) {
        const cached = localStorage.getItem('pos_offline_profile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.lastLogin) parsed.lastLogin = new Date(parsed.lastLogin);
            setProfile(parsed);
            setUser({ id: parsed.id, email: parsed.email } as any);
            setSession(null);
            setLoading(false);
            return;
          } catch (e) { }
        }
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

    try {
      const updatedProfile = await usersService.update(user.id, updates)
      setProfile(updatedProfile)
    } catch (error) {
      throw error
    }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error

    if (profile?.email) {
      const hash = await hashPasswordString(password)
      localStorage.setItem(`offline_hash_${profile.email}`, hash)
      try {
        const localUser = await localDb.users.get(profile.id)
        if (localUser) {
          (localUser as any).offlineHash = hash
          await localDb.users.put(localUser)
        }
      } catch (e) {
      }
      supabase.from('users').update({ offline_hash: hash }).eq('id', profile.id)
        .then(({ error }) => {
        });
    }
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
