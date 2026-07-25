"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Bot, Wallet, Menu, LogOut, User, Tv } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { formatUGX } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, walletBalance, bonusBalance,
          unreadCount, setSidebarOpen, sidebarOpen, setAiDrawerOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions as user types
  useEffect(() => {
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/search/suggestions?q=${searchQuery}`);
        setSuggestions(res.data.data.suggestions || []);
        setShowSuggestions(true);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (q?: string) => {
    const query = q || searchQuery;
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("voltrix_access_token");
    localStorage.removeItem("voltrix_refresh_token");
    window.location.href = "/login";
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f0f0f] border-b border-white/10 z-50 flex items-center px-4 gap-4">
      {/* Left — logo + toggle */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <Menu size={20} />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Tv size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Voltrix</span>
        </Link>
      </div>

      {/* Center — search */}
      <div className="flex-1 max-w-2xl relative" ref={searchRef}>
        <div className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            placeholder="Search videos, movies, creators..."
            className="w-full bg-white/5 border border-white/10 rounded-l-full px-5 py-2 text-sm focus:outline-none focus:border-white/30 placeholder-gray-500"
          />
          <button onClick={() => handleSearch()}
            className="bg-white/10 hover:bg-white/20 border border-l-0 border-white/10 rounded-r-full px-5 transition-colors">
            <Search size={18} />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { setSearchQuery(s); handleSearch(s); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 text-left">
                <Search size={14} className="text-gray-500" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* AI Assistant */}
        <button onClick={() => setAiDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          title="AI Assistant">
          <Bot size={20} />
        </button>

        {isAuthenticated ? (
          <>
            {/* Wallet balance */}
            <Link href="/wallet"
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm transition-colors">
              <Wallet size={14} className="text-yellow-400" />
              <span className="font-medium">{formatUGX(walletBalance)}</span>
              {bonusBalance > 0 && (
                <span className="text-xs text-green-400">+{formatUGX(bonusBalance)}</span>
              )}
            </Link>

            {/* Notifications */}
            <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center font-bold text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="font-medium">@{user?.username}</p>
                    <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                  </div>
                  {[
                    { href: `/channel/me`, label: "My Channel" },
                    { href: "/studio", label: "Creator Studio" },
                    { href: "/wallet", label: "Wallet" },
                    { href: "/settings", label: "Settings" },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href} onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors">
                      {label}
                    </Link>
                  ))}
                  <div className="border-t border-white/10">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors">
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="px-4 py-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/signup"
              className="px-4 py-1.5 text-sm bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
