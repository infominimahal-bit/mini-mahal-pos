import { supabase } from '../supabase';

export async function updateSyncTime() {
    try {
        const now = new Date().toISOString();
        localStorage.setItem('local_handshake', now);
        window.dispatchEvent(new Event('sync-status-changed'));
    } catch (err) {}
}

export async function getSyncTime(): Promise<Date | null> {
    try {
        const { data, error } = await supabase.from('app_settings').select('updated_at').limit(1).maybeSingle();
        if (error || !data || !data.updated_at) return null;
        return new Date(data.updated_at);
    } catch (err) {
        return null;
    }
}
