"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { useAppStore } from "@/store/app.store";
import { formatUGX } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { Camera, Edit3 } from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.data;
    },
  });

  const { data: walletData } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const res = await api.get("/wallet/balance");
      return res.data.data;
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch("/users/me", { bio });
      setUser({ ...user!, bio });
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const p = profile || user;

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Avatar + info */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-4xl font-bold">
              {p?.username?.charAt(0).toUpperCase()}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center transition-colors">
              <Camera size={14} />
            </button>
          </div>
          <h1 className="text-2xl font-bold">@{p?.username}</h1>
          <p className="text-gray-400 text-sm mt-1 capitalize">{p?.role} · {p?.country}</p>

          {/* Bio */}
          {editing ? (
            <div className="w-full mt-4">
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 resize-none placeholder-gray-600"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditing(false)}
                  className="flex-1 bg-white/10 py-2 rounded-xl text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-xl text-sm font-semibold transition-colors">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <p className="text-gray-400 text-sm">{p?.bio || "No bio yet"}</p>
              <button onClick={() => setEditing(true)} className="text-gray-600 hover:text-white">
                <Edit3 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Wallet", value: formatUGX(walletData?.balance_ugx || 0) },
            { label: "Bonus", value: formatUGX(walletData?.bonus_balance_ugx || 0) },
            { label: "Role", value: p?.role || "viewer" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-semibold capitalize truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Menu links */}
        <div className="space-y-2">
          {[
            { href: "/studio", label: "Creator Studio", desc: "Manage your content and earnings" },
            { href: "/wallet", label: "Wallet", desc: "Top up and manage balance" },
            { href: "/library", label: "Library", desc: "Saved videos and purchases" },
            { href: "/settings", label: "Settings", desc: "Account, privacy, notifications" },
            { href: "/settings/family", label: "Family Controls", desc: "Link and manage child accounts" },
          ].map(({ href, label, desc }) => (
            <Link key={href} href={href}
              className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-5 py-4 transition-colors">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <span className="text-gray-500">›</span>
            </Link>
          ))}

          <button onClick={() => {
            localStorage.clear();
            window.location.href = "/login";
          }} className="w-full flex items-center justify-between bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-xl px-5 py-4 transition-colors text-red-400">
            <p className="text-sm font-medium">Sign Out</p>
            <span>›</span>
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
