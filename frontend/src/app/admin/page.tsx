"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatUGX } from "@/lib/utils";
import Link from "next/link";
import {
  Users, Film, DollarSign, AlertTriangle,
  TrendingUp, Wifi, Settings, BarChart2,
  ShieldAlert, Bell, DollarSignIcon, Search
} from "lucide-react";

export default function AdminPage() {
  const { data: dashboard } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard");
      return res.data.data;
    },
  });

  const { data: revenue } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const res = await api.get("/admin/revenue");
      return res.data.data;
    },
  });

  const { data: cost } = useQuery({
    queryKey: ["admin-cost"],
    queryFn: async () => {
      const res = await api.get("/admin/cost");
      return res.data.data;
    },
  });

  const stats = [
    { label: "Total Users", value: dashboard?.total_users?.toLocaleString() || "0", icon: Users, color: "text-blue-400", href: "/admin/users" },
    { label: "Live Streams", value: dashboard?.live_streams || "0", icon: Wifi, color: "text-red-400", href: "/admin/streams" },
    { label: "Revenue Today", value: formatUGX(revenue?.month_total_ugx || 0), icon: DollarSign, color: "text-green-400", href: "/admin/revenue" },
    { label: "Pending Review", value: dashboard?.pending_moderation || "0", icon: AlertTriangle, color: "text-yellow-400", href: "/admin/moderation" },
  ];

  const navLinks = [
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/content", label: "Content", icon: Film },
    { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
    { href: "/admin/revenue", label: "Revenue", icon: TrendingUp },
    { href: "/admin/cost", label: "AWS Costs", icon: BarChart2 },
    { href: "/admin/missing-content", label: "Missing Content", icon: Search },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Admin header */}
      <header className="h-14 bg-[#0f0f0f] border-b border-white/10 flex items-center px-6 gap-4">
        <span className="font-bold text-lg">Voltrix Admin</span>
        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">Admin</span>
        <Link href="/" className="ml-auto text-sm text-gray-400 hover:text-white">← Platform</Link>
      </header>

      <div className="flex">
        {/* Admin sidebar */}
        <aside className="w-52 min-h-[calc(100vh-56px)] border-r border-white/10 py-4 px-2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors mb-1">
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </aside>

        {/* Admin main */}
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-sm text-gray-400">All systems operational</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(({ label, value, icon: Icon, color, href }) => (
              <Link key={label} href={href}
                className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-5 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">{label}</p>
                  <Icon size={18} className={color} />
                </div>
                <p className="text-2xl font-bold">{value}</p>
              </Link>
            ))}
          </div>

          {/* Revenue + Cost row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue breakdown */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Revenue (Month to Date)</h2>
                <Link href="/admin/revenue" className="text-xs text-blue-400">View all →</Link>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Ad Revenue", value: revenue?.ads_ugx || 0 },
                  { label: "Subscriptions", value: revenue?.subscriptions_ugx || 0 },
                  { label: "Pay-Per-View", value: revenue?.ppv_ugx || 0 },
                  { label: "Tips", value: revenue?.tips_ugx || 0 },
                  { label: "Total", value: revenue?.month_total_ugx || 0, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className={`flex justify-between items-center py-2 border-b border-white/5 last:border-0 ${bold ? "pt-3" : ""}`}>
                    <span className={`text-sm ${bold ? "font-semibold text-white" : "text-gray-400"}`}>{label}</span>
                    <span className={`text-sm ${bold ? "font-bold text-green-400" : ""}`}>{formatUGX(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AWS Cost overview */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">AWS Costs (Month to Date)</h2>
                <Link href="/admin/cost" className="text-xs text-blue-400">View all →</Link>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-400 text-sm">Total MTD</span>
                  <span className="text-xl font-bold">${cost?.month_to_date_usd?.toFixed(2) || "0.00"}</span>
                </div>
                {cost?.by_service?.slice(0, 5).map((s: any) => (
                  <div key={s.service} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{s.service}</span>
                        <span>${s.cost_usd}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full">
                        <div className="h-1.5 bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (s.cost_usd / (cost.month_to_date_usd || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Missing content requests */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Top Missing Content Requests</h2>
              <Link href="/admin/missing-content" className="text-xs text-blue-400">Manage →</Link>
            </div>
            <MissingContentWidget />
          </div>
        </main>
      </div>
    </div>
  );
}

function MissingContentWidget() {
  const { data } = useQuery({
    queryKey: ["missing-content"],
    queryFn: async () => {
      const res = await api.get("/admin/missing-content?limit=5");
      return res.data.data;
    },
  });

  if (!data?.length) return <p className="text-gray-500 text-sm">No missing content requests</p>;

  return (
    <div className="space-y-2">
      {data.map((item: any) => (
        <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
          <div>
            <p className="text-sm font-medium">"{item.query}"</p>
            <p className="text-xs text-gray-500 capitalize">{item.content_type || "any"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-yellow-400">{item.count} requests</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              item.status === "open" ? "bg-yellow-500/20 text-yellow-400" :
              item.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
              "bg-green-500/20 text-green-400"
            }`}>{item.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
