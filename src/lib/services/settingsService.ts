import { supabase } from '../supabase';
import {
  AppSettings,
} from '../../types';
import { localDb, SETTINGS_ID } from '../localDb';
import { cloudWrite } from '../cloudWrite';
import { fetchAllPages } from './utils';
import { mapSettings, toRemoteSettings } from './settingsMappers';

export const settingsService = {
  async get(): Promise<AppSettings | null> {
    const local = await localDb.appSettings.get(SETTINGS_ID);
    if (local) return local;
    return await this.fetchRemote();
  },
  async fetchRemote(lastSyncTime?: Date): Promise<AppSettings | null> {
    const queryFn = () => {
      let q = supabase.from('app_settings').select('*').eq('id', SETTINGS_ID);
      if (lastSyncTime) q = q.gte('updated_at', lastSyncTime.toISOString());
      return q;
    };
    const data = await fetchAllPages(queryFn);
    if (!data || data.length === 0) return null;
    return mapSettings(data[0]);
  },
  async update(updates: Partial<AppSettings>): Promise<void> {
    const existing = await this.get();
    const now = new Date();
    const updated = {
      ...(existing || {}),
      ...updates,
      id: SETTINGS_ID,
      updatedAt: now
    } as AppSettings;

    // Safety: ensure timestamps are updated
    if (!updated.createdAt) updated.createdAt = now;

    // Map for remote sync
    const remotePayload = toRemoteSettings(updated);
    remotePayload.id = SETTINGS_ID;

    // Cloud-direct (authoritative, role-gated inside cloudWrite), then local cache.
    await cloudWrite('app_settings', 'update', SETTINGS_ID, remotePayload);
    await localDb.appSettings.put(updated);
  }
};

export { mapSettings, toRemoteSettings } from './settingsMappers';

/**
 * Expenses Service
 */
