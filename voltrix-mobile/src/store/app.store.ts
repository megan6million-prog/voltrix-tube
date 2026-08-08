import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  role: string;
  avatar_url?: string;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  walletBalance: number;
  bonusBalance: number;
  unreadCount: number;
  unreadMessages: number;
  setUser: (user: User | null) => void;
  setWalletBalance: (bal: number, bonus?: number) => void;
  setUnreadCount: (n: number) => void;
  setUnreadMessages: (n: number) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  walletBalance: 0,
  bonusBalance: 0,
  unreadCount: 0,
  unreadMessages: 0,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setWalletBalance: (bal, bonus = 0) => set({ walletBalance: bal, bonusBalance: bonus }),
  setUnreadCount: (n) => set({ unreadCount: n }),
  setUnreadMessages: (n) => set({ unreadMessages: n }),
  logout: () => set({ user: null, isAuthenticated: false, walletBalance: 0 }),
}));
