"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  HandCoins,
  PiggyBank,
  TrendingUp,
  Settings,
  Target,
  HeartPulse,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { DatePeriodFilter } from "@/components/layout/month-year-picker";
import { DbSyncIndicator } from "@/components/shared/db-sync-indicator";

const navGroups = [
  {
    title: "Core",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/transactions", label: "Transactions", icon: Receipt },
    ],
  },
  {
    title: "Planning",
    items: [
      { href: "/budgets", label: "Budgets", icon: PiggyBank },
      { href: "/goals", label: "Goals", icon: Target },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/financial-health", label: "Financial Health", icon: HeartPulse },
      { href: "/analytics", label: "Reports", icon: TrendingUp },
      { href: "/borrow-lend", label: "Borrow & Lend", icon: HandCoins },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/guide", label: "Methodology Guide", icon: HelpCircle },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-card/85 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">₹</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Finance</span>
        </div>
        <DbSyncIndicator />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest px-3 block">
              {group.title}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Month/Year Picker */}
      {pathname !== "/" && (
        <div className="px-3 py-4 border-t border-border">
          <DatePeriodFilter />
        </div>
      )}

      {/* Account */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-3">
        <UserButton
          appearance={{ elements: { avatarBox: "w-8 h-8" } }}
          showName
        />
      </div>
    </aside>
  );
}
