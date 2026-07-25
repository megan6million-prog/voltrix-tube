"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Bell, Check } from "lucide-react";

const NOTIF_ICONS: Record<string, string> = {
  new_video: "🎬",
  live_started: "🔴",
  comment_reply: "💬",
  tip_received: "💰",
  earning_credited: "✅",
  payout_completed: "💸",
  membership_joined: "⭐",
  strike_issued: "⚠️",
  system: "📢",
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications?limit=50");
      return res.data.data;
    },
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read", { notification_ids: "all" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data?.notifications || [];
  const unread = notifications.filter((n: any) => !n.is_read);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unread.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {unread.length}
              </span>
            )}
          </div>
          {unread.length > 0 && (
            <button onClick={() => markAll.mutate()}
              className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
              <Check size={14} /> Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Bell size={48} className="mb-4 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                  !n.is_read ? "bg-white/8 border border-white/10" : "bg-white/3 hover:bg-white/5"
                }`}>
                <span className="text-2xl flex-shrink-0">{NOTIF_ICONS[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  {n.title && <p className="text-sm font-medium">{n.title}</p>}
                  {n.body && <p className="text-sm text-gray-400 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
