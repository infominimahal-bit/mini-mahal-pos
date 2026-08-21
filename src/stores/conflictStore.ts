import { create } from 'zustand';
import { localDb } from '../lib/localDb';
import { supabase } from '../lib/supabase';

interface Conflict {
  id: string;
  entity: string;
  entityId: string;
  localVersion: any;
  cloudVersion: any;
  pendingOpId: number;
  detectedAt: Date;
  resolved: boolean;
}

export const useConflictStore = create<{
  conflicts: Conflict[];
  addConflict(c: Omit<Conflict, 'id' | 'detectedAt' | 'resolved'>): void;
  resolveConflict(id: string, winner: 'local' | 'cloud'): Promise<void>;
}>((set, get) => ({
  conflicts: [],
  addConflict: (c) => set(s => ({
    conflicts: [...s.conflicts, { ...c, id: `cf-${c.entityId}-${Date.now()}`, detectedAt: new Date(), resolved: false }],
  })),
  resolveConflict: async (cid, winner) => {
    const c = get().conflicts.find(x => x.id === cid);
    if (!c) return;
    if (winner === 'local') {
      await supabase.from(c.entity).upsert(c.localVersion, { onConflict: 'id' }).catch(console.error);
    }
    if (c.pendingOpId != null) {
      await localDb.pendingOps.delete(c.pendingOpId).catch(() => {});
    }
    set(s => ({ conflicts: s.conflicts.map(x => x.id === cid ? { ...x, resolved: true } : x) }));
  },
}));
