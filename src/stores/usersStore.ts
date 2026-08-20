import { create } from 'zustand';
import { User, Salesman } from '../types';

interface UsersState {
  users: User[];
  currentUser: User | null;
  salesmen: Salesman[];
  setUsers: (u: User[]) => void;
  setCurrentUser: (u: User | null) => void;
  setSalesmen: (s: Salesman[]) => void;
  addSalesman: (s: Salesman) => void;
  updateSalesman: (s: Salesman) => void;
  deleteSalesman: (id: string) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  currentUser: null,
  salesmen: [],

  setUsers: (users) => set({ users }),
  setCurrentUser: (currentUser) => set({ currentUser }),

  setSalesmen: (salesmen) => set({ salesmen }),
  addSalesman: (salesman) => set((st) =>
    st.salesmen.some((s) => s.id === salesman.id) ? st : { salesmen: [...st.salesmen, salesman] }
  ),
  updateSalesman: (salesman) => set((st) =>
    ({ salesmen: st.salesmen.map((s) => (s.id === salesman.id ? salesman : s)) })
  ),
  deleteSalesman: (id) => set((st) => ({ salesmen: st.salesmen.filter((s) => s.id !== id) })),
}));
