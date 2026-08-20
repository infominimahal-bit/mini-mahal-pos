import { supabase } from '../lib/supabase'
import { User } from '../types'
import { usersService } from '../lib/services'
import { hashPasswordString } from '../lib/authUtils'
import { localDb } from '../lib/localDb'

interface ProfileUpdateDeps {
  user: any
  profile: any
  setProfile: any
  loadProfile: (userId: string) => Promise<void>
}

export function createUpdateProfile(deps: ProfileUpdateDeps) {
  const { user, setProfile } = deps

  return async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error('No user logged in')

    try {
      const updatedProfile = await usersService.update(user.id, updates)
      setProfile(updatedProfile)
    } catch (error) {
      throw error
    }
  }
}

export function createUpdatePassword(deps: ProfileUpdateDeps) {
  const { profile } = deps

  return async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error

    // Update offline hash in ALL stores
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
        console.warn('Failed to update local offline hash:', e)
      }
      // Sync hash to cloud for new-device offline support
      supabase.from('users').update({ offline_hash: hash }).eq('id', profile.id)
        .then(({ error }) => {
          if (!error) console.log('✅ Cloud offline hash updated after password change.');
        });
    }
  }
}

export function createRefreshProfile(deps: ProfileUpdateDeps) {
  const { user, loadProfile } = deps

  return async function refreshProfile() {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }
}
