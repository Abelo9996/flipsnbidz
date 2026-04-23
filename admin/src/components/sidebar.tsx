"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Gavel,
  Share2,
  Mail,
  Search,
  BarChart3,
  LogOut,
  ShoppingBag,
  TrendingUp,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/auctions", label: "Auctions", icon: Gavel },
  { href: "/dashboard/offerup", label: "OfferUp", icon: ShoppingBag },
  { href: "/dashboard/profit", label: "Profit Sheet", icon: TrendingUp },
  { href: "/dashboard/auction-notifications", label: "Auction Notifications", icon: Bell },
  { href: "/dashboard/social", label: "Social Media", icon: Share2 },
  { href: "/dashboard/emails", label: "Email Campaigns", icon: Mail },
  { href: "/dashboard/seo", label: "SEO Manager", icon: Search },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-blue-600/20 text-blue-400"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const shellClass = mobile
    ? "flex h-full w-full flex-col bg-gray-900 text-white"
    : "fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-gray-800 bg-gray-900 lg:flex";

  return (
    <aside className={shellClass}>
      <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
        <Gavel className="h-6 w-6 text-blue-500" />
        <span className="text-lg font-bold text-white">Flips &amp; Bidz</span>
      </div>
      <SidebarNav />
      <div className="border-t border-gray-800 p-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
