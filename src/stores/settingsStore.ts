import { create } from 'zustand';
import { AppSettings } from '../types';

interface SettingsState {
  settings: AppSettings;
  paymentModes: any[];
  loading: boolean;
  error: string | null;
  syncProgress: {
    status: string;
    current: number;
    total: number;
    size?: string;
  } | null;
  setSettings: (s: Partial<AppSettings>) => void;
  setPaymentModes: (m: any[]) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
  setSyncProgress: (p: SettingsState['syncProgress']) => void;
  incrementInvoiceCounter: (n: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {} as AppSettings,
  paymentModes: [],
  loading: true,
  error: null,
  syncProgress: null,

  setSettings: (payload) => set((st) => {
    const newSettings = { ...st.settings, ...payload } as AppSettings;
    if (newSettings.retailEnabled === false && newSettings.wholesaleEnabled === false) {
      newSettings.retailEnabled = true;
    }
    return { settings: newSettings };
  }),

  setPaymentModes: (paymentModes) => set({ paymentModes }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSyncProgress: (syncProgress) => set({ syncProgress }),
  incrementInvoiceCounter: (n) => set((st) => ({ settings: { ...st.settings, invoiceCounter: n } })),
}));
