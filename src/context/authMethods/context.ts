import { createContext } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { User } from '../types'

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export interface AuthMethodDeps {
  setProfile: any
  setUser: any
  setSession: any
  setLoading: any
  user: any
  profile: any
}
