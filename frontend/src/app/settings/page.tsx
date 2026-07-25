"use client";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import Link from "next/link";
import { useAppStore } from "@/store/app.store";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Moon, Sun, Globe, Bell, Shield, CreditCard, Users, Lock, ChevronRight } from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    title: "Account",
    items: [
      { href: "/settings/profile", label: "Edit Profile", desc: "Username, bio, avatar", icon: "👤" },
      { href: "/settings/account", label: "Account & Security", desc: "Phone, password, 2FA", icon: "🔐" },
      { href: "/settings/social-links", label: "Social Links", desc: "Link TikTok, YouTube, WhatsApp", icon: "🔗" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { href: "/settings/notifications", label: "Notifications", desc: "Push, SMS, email alerts", icon: "🔔" },
      { href: "/settings/privacy", label: "Privacy", desc: "Who can message you, DM settings", icon: "🛡️" },
      { href: "/settings/language", label: "Language", desc: "English, Luganda, Swahili", icon: "🌐" },
    ],
  },
  {
    title: "Family",
    items: [
      { href: "/settings/family", label: "Family Controls", desc: "Link and manage child accounts", icon: "👨‍👩‍👧" },
      { href: "/settings/kids-mode", label: "Kids Mode", desc: "Set PIN and enable kids view", icon: "🧒" },
    ],
  },
  {
    title: "Payments",
    items: [
      { href: "/wallet", label: "Wallet & Payments", desc: "Balance, top-up, transactions", icon: "💰" },
      { href: "/settings/promo", label: "Promo Code", desc: "Redeem a promotional code", icon: "🎟️" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/help", label: "Help Center", desc: "FAQs and support", icon: "❓" },
      { href: "/terms", label: "Terms of Service", desc: "Platform rules and policies", icon: "📄" },
      { href: "/privacy-policy", label: "Privacy Policy", desc: "How we use your data", icon: "🔒" },
    ],
  },
];

export default function SettingsPage() {
  const { dataSaverMode, setDataSaverMode } = useAppStore();
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [showPromo, setShowPromo] = useState(false);

  const handleRedeemPromo = async () => {
    try {
      const res = await api.post("/users/me/promo-code", { code: promoCode });
      setPromoMsg(`✅ ${res.data.data.benefit} applied!`);
    } catch (err: any) {
      setPromoMsg(err.response?.data?.detail || "Invalid promo code");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Data saver toggle */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Data Saver Mode</p>
            <p className="text-xs text-gray-400 mt-0.5">Lower quality video, save mobile data</p>
          </div>
          <button
            onClick={() => setDataSaverMode(!dataSaverMode)}
            className={`w-12 h-6 rounded-full transition-colors relative ${dataSaverMode ? "bg-green-500" : "bg-white/20"}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dataSaverMode ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Sections */}
        {SETTINGS_SECTIONS.map(({ title, items }) => (
          <div key={title} className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">{title}</p>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
              {items.map(({ href, label, desc, icon }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Promo code */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <p className="text-sm font-medium mb-3">Redeem Promo Code</p>
          {promoMsg && (
            <p className={`text-sm mb-3 ${promoMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
              {promoMsg}
            </p>
          )}
          <div className="flex gap-2">
            <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600 uppercase"
            />
            <button onClick={handleRedeemPromo} disabled={!promoCode}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Apply
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
          className="w-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-red-400 py-4 rounded-xl text-sm font-medium transition-colors">
          Sign Out
        </button>

        <p className="text-center text-xs text-gray-600 mt-4">Voltrix v1.0.0</p>
      </div>
    </MainLayout>
  );
}
