"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { formatUGX, timeAgo } from "@/lib/utils";
import Link from "next/link";
import {
  BarChart2, Upload, Radio, TrendingUp,
  DollarSign, Users, Eye, ArrowUpRight
} from "lucide-react";

export default function StudioPage() {
  const { data: earnings } = useQuery({
    queryKey: ["creator-earnings"],
    queryFn: async () => {
      const res = await api.get("/channels/me/earnings");
      return res.data.data;
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["creator-analytics"],
    queryFn: async () => {
      const res = await api.get("/channels/me/analytics");
      return res.data.data;
    },
  });

  const stats = [
    { label: "Views", value: analytics?.views?.toLocaleString() || "0", icon: Eye, color: "text-blue-400" },
    { label: "Subscribers", value: analytics?.subscribers?.toLocaleString() || "0", icon: Users, color: "text-purple-400" },
    { label: "Earnings", value: formatUGX(earnings?.available_ugx || 0), icon: DollarSign, color: "text-green-400" },
    { label: "Pending", value: formatUGX(earnings?.pending_ugx || 0), icon: TrendingUp, color: "text-yellow-400" },
  ];

  const quickActions = [
    { href: "/upload", label: "Upload Video", icon: Upload, color: "bg-red-600 hover:bg-red-700" },
    { href: "/studio/live", label: "Go Live", icon: Radio, color: "bg-purple-600 hover:bg-purple-700" },
    { href: "/studio/analytics", label: "Analytics", icon: BarChart2, color: "bg-blue-600 hover:bg-blue-700" },
    { href: "/studio/earnings", label: "Earnings", icon: DollarSign, color: "bg-green-600 hover:bg-green-700" },
  ];

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Creator Studio</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your content and earnings</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">{label}</p>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {quickActions.map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}
              className={`${color} flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-sm transition-colors`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>

        {/* Earnings breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Earnings</h2>
              <Link href="/studio/earnings" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { label: "Available to withdraw", value: earnings?.available_ugx || 0, color: "text-green-400" },
                { label: "Pending (7-day hold)", value: earnings?.pending_ugx || 0, color: "text-yellow-400" },
                { label: "Lifetime earned", value: earnings?.lifetime_earned || 0, color: "text-white" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-400">{label}</span>
                  <span className={`text-sm font-semibold ${color}`}>{formatUGX(value)}</span>
                </div>
              ))}
            </div>
            <Link href="/studio/earnings"
              className="mt-4 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-3 rounded-xl text-sm font-semibold transition-colors">
              <DollarSign size={16} />
              Withdraw Earnings
            </Link>
          </div>

          {/* How you earn guide */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="font-semibold mb-4">How You Earn</h2>
            <div className="space-y-3">
              {[
                { type: "Ad Revenue", cut: "55%", status: "Active" },
                { type: "Channel Memberships", cut: "75%", status: "Active" },
                { type: "Tips / Super Thanks", cut: "90%", status: "Active" },
                { type: "Pay-Per-View", cut: "70%", status: "Active" },
                { type: "Movie Clip Referral", cut: "10% per sale", status: "Active" },
                { type: "Sports Referral", cut: "8% per PPV", status: "Active" },
              ].map(({ type, cut, status }) => (
                <div key={type} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm">{type}</p>
                    <p className="text-xs text-gray-500">Your cut: {cut}</p>
                  </div>
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
