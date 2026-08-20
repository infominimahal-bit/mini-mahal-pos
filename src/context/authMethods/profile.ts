import { supabase } from '../../lib/supabase'
import { User } from '../../types'
import { usersService } from '../../lib/services'
import { hashPasswordString } from '../../lib/authUtils'
import { localDb } from '../../lib/localDb'
import { sonner } from '../../lib/sonner'
import { AuthMethodDeps } from './context'
import { loadProfileImpl } from './loadProfile'

export async function updateProfileImpl(updates: Partial<User>, deps: AuthMethodDeps) {
  if (!deps.user) throw new Error('No user logged in')

  try {
    const updatedProfile = await usersService.update(deps.user.id, updates)
    deps.setProfile(updatedProfile)
  } catch (error) {
    throw error
  }
}

export async function updatePasswordImpl(password: string, deps: AuthMethodDeps) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error

  if (deps.profile?.email) {
    const hash = await hashPasswordString(password)
    localStorage.setItem(`offline_hash_${deps.profile.email}`, hash)
    try {
      const localUser = await localDb.users.get(deps.profile.id)
      if (localUser) {
        (localUser as any).offlineHash = hash
        await localDb.users.put(localUser)
      }
    } catch (e) {
      console.warn('Failed to update local offline hash:', e)
    }
    supabase.from('users').update({ offline_hash: hash }).eq('id', deps.profile.id)
      .then(({ error }) => {
        if (!error) console.log('✅ Cloud offline hash updated after password change.');
      });
  }
}

export async function refreshProfileImpl(deps: AuthMethodDeps) {
  if (deps.user?.id) {
    await loadProfileImpl(deps.user.id, deps);
  }
}
