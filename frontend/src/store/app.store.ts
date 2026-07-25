import { create } from "zustand";

interface User {
  id: string;
  username: string;
  role: string;
  avatar_url?: string;
  bio?: string;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;

  // Wallet
  walletBalance: number;
  bonusBalance: number;
  setWalletBalance: (bal: number, bonus?: number) => void;

  // Notifications
  unreadCount: number;
  setUnreadCount: (n: number) => void;

  // Player (mini player)
  currentVideoId: string | null;
  playerMinimized: boolean;
  setCurrentVideo: (id: string | null) => void;
  setPlayerMinimized: (v: boolean) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  kidsMode: boolean;
  setKidsMode: (v: boolean) => void;
  dataSaverMode: boolean;
  setDataSaverMode: (v: boolean) => void;

  // AI drawer
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (v: boolean) => void;

  // Messages
  unreadMessages: number;
  setUnreadMessages: (n: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  walletBalance: 0,
  bonusBalance: 0,
  setWalletBalance: (bal, bonus = 0) => set({ walletBalance: bal, bonusBalance: bonus }),

  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),

  currentVideoId: null,
  playerMinimized: false,
  setCurrentVideo: (id) => set({ currentVideoId: id, playerMinimized: false }),
  setPlayerMinimized: (v) => set({ playerMinimized: v }),

  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  kidsMode: false,
  setKidsMode: (v) => set({ kidsMode: v }),
  dataSaverMode: false,
  setDataSaverMode: (v) => set({ dataSaverMode: v }),

  aiDrawerOpen: false,
  setAiDrawerOpen: (v) => set({ aiDrawerOpen: v }),

  unreadMessages: 0,
  setUnreadMessages: (n) => set({ unreadMessages: n }),
}));
