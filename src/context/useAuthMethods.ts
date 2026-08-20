import { AuthContextType, AuthContext, AuthMethodDeps } from './authMethods/context'
import { loadProfileImpl } from './authMethods/loadProfile'
import { signInImpl } from './authMethods/signIn'
import { signUpImpl } from './authMethods/signUp'
import { signOutImpl } from './authMethods/signOut'
import { updateProfileImpl, updatePasswordImpl, refreshProfileImpl } from './authMethods/profile'

export { AuthContextType, AuthContext }

export function useAuthMethods(setProfile: any, setUser: any, setSession: any, setLoading: any) {
  const deps: AuthMethodDeps = { setProfile, setUser, setSession, setLoading, user: undefined, profile: undefined };

  async function loadProfile(userId: string) {
    return loadProfileImpl(userId, deps);
  }

  async function signIn(identifier: string, password: string) {
    return signInImpl(identifier, password, deps);
  }

  async function signUp(email: string, password: string, name: string, username: string) {
    return signUpImpl(email, password, name, username, deps);
  }

  async function signOut() {
    return signOutImpl(deps);
  }

  async function updateProfile(updates: any) {
    return updateProfileImpl(updates, deps);
  }

  async function updatePassword(password: string) {
    return updatePasswordImpl(password, deps);
  }

  async function refreshProfile() {
    return refreshProfileImpl(deps);
  }

  return { loadProfile, signIn, signUp, signOut, updateProfile, updatePassword, refreshProfile };
}
