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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/borrow-lend", label: "Borrow", icon: HandCoins },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/analytics", label: "Reports", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[340px] px-4 animate-fade-in-up">
      <nav className="flex items-center justify-between bg-card/80 dark:bg-card/90 backdrop-blur-md border border-border/80 p-1.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "p-2 rounded-full transition-all duration-300 relative flex items-center justify-center w-10 h-10 cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
