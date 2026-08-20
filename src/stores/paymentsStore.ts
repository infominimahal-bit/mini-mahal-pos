import { create } from 'zustand';
import { Payment } from '../types';

interface PaymentsState {
  payments: Payment[];
  setPayments: (p: Payment[]) => void;
}

export const usePaymentsStore = create<PaymentsState>((set) => ({
  payments: [],
  setPayments: (payments) => set({ payments }),
}));
