"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/upload", icon: PlusCircle, label: "Upload" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0f0f0f] border-t border-white/10 flex md:hidden z-50">
      {tabs.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href}
          className={cn("flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
            pathname === href ? "text-white" : "text-gray-500")}>
          <Icon size={22} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
