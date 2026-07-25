"use client";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import AIDrawer from "@/components/ai/AIDrawer";
import { useAppStore } from "@/store/app.store";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect } from "react";
import api from "@/lib/api";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { setUser, setWalletBalance, setUnreadCount, sidebarOpen } = useAppStore();
  useWebSocket(); // Connect WebSocket for real-time events

  useEffect(() => {
    const token = localStorage.getItem("voltrix_access_token");
    if (!token) return;

    // Load user profile and wallet on mount
    Promise.all([
      api.get("/users/me"),
      api.get("/wallet/balance"),
      api.get("/notifications?unread_only=true&limit=1"),
    ])
      .then(([userRes, walletRes, notifRes]) => {
        setUser(userRes.data.data);
        setWalletBalance(
          walletRes.data.data.balance_ugx,
          walletRes.data.data.bonus_balance_ugx
        );
        setUnreadCount(notifRes.data.data.unread_count || 0);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className={`flex-1 min-h-[calc(100vh-64px)] transition-all ${sidebarOpen ? "md:ml-56" : ""}`}>
          {children}
        </main>
      </div>
      {/* Mobile bottom nav */}
      <BottomNav />
      {/* AI Assistant */}
      <AIDrawer />
    </div>
  );
}
