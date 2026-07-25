"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Search, TrendingUp, Film, Tv, Gamepad2,
  BookOpen, Music2, Library, History, Bookmark, ShoppingBag
} from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { cn } from "@/lib/cn";

const mainLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/sports", label: "Sports", icon: Tv },
  { href: "/gaming", label: "Gaming", icon: Gamepad2 },
  { href: "/education", label: "Education", icon: BookOpen },
  { href: "/sounds", label: "Sounds", icon: Music2 },
];

const libraryLinks = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/history", label: "History", icon: History },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/purchases", label: "Purchases", icon: ShoppingBag },
];

export default function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-56 bg-[#0f0f0f] border-r border-white/10 overflow-y-auto z-30 hidden md:block">
      <div className="py-4">
        {/* Main nav */}
        <div className="px-2 space-y-1">
          {mainLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === href
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>

        <div className="my-3 border-t border-white/10" />

        {/* Library */}
        <div className="px-2 space-y-1">
          <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Library
          </p>
          {libraryLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === href
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
