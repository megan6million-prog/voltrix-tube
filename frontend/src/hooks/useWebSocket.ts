"use client";
import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/app.store";

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090/v1")
  .replace("https://", "wss://")
  .replace("http://", "ws://")
  .replace("/v1", "");

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setUnreadCount, setWalletBalance, walletBalance, bonusBalance } = useAppStore();

  const showToast = (message: string) => {
    if (typeof window === "undefined") return;
    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);color:white;font-size:13px;padding:10px 18px;border-radius:999px;z-index:9999;white-space:nowrap;";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  const handleEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case "notification":
        setUnreadCount(useAppStore.getState().unreadCount + 1);
        showToast(data.title || data.body || "New notification");
        break;
      case "wallet_credited":
        setWalletBalance(data.new_balance ?? walletBalance, bonusBalance);
        showToast(`💰 UGX ${(data.amount || 0).toLocaleString()} added to wallet`);
        break;
      case "earning_credited":
        showToast(`✅ Earned UGX ${(data.amount || 0).toLocaleString()} — ${data.type || ""}`);
        break;
      case "payout_completed":
        showToast(`💸 Payout of UGX ${(data.amount || 0).toLocaleString()} sent`);
        break;
      case "tip_received":
        showToast(`💰 ${data.from_user || "Someone"} tipped UGX ${(data.amount || 0).toLocaleString()}`);
        break;
    }
  }, [walletBalance, bonusBalance, setUnreadCount, setWalletBalance]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("voltrix_access_token");
    if (!token) return;

    try {
      const ws = new WebSocket(`${WS_URL}/v1/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      };

      ws.onmessage = (e) => {
        try {
          const { event, data } = JSON.parse(e.data);
          handleEvent(event, data);
        } catch {}
      };

      ws.onclose = () => {
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    } catch {}
  }, [handleEvent]);

  const send = useCallback((action: string, data?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, data }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { send };
}
