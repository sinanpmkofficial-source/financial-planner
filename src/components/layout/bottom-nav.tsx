"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  Target,
  MoreHorizontal,
  HeartPulse,
  HandCoins,
  TrendingUp,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const primaryItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[340px] px-4 animate-fade-in-up">
      <nav className="flex items-center justify-between bg-card/45 backdrop-blur-xl border border-white/5 p-1.5 rounded-full shadow-2xl shadow-black/80">
        {primaryItems.map((item) => {
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

        {/* More Drawer Button */}
        <Sheet>
          <SheetTrigger
            render={
              <button
                className={cn(
                  "p-2 rounded-full transition-all duration-300 relative flex items-center justify-center w-10 h-10 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                title="More"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            }
          />
          <SheetContent side="bottom" className="rounded-t-3xl border-t border-white/5 bg-card/60 backdrop-blur-xl p-6 gap-6">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                More Options
              </SheetTitle>
              <SheetDescription className="sr-only">
                Secondary navigation menu containing analytics, loans, health, and settings options.
              </SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/financial-health", label: "Financial Health", icon: HeartPulse, desc: "Audit score & 50-30-20" },
                { href: "/borrow-lend", label: "Borrow & Lend", icon: HandCoins, desc: "Track loans & debts" },
                { href: "/analytics", label: "Reports & Trends", icon: TrendingUp, desc: "Cash flow analytics" },
                { href: "/settings", label: "Settings", icon: Settings, desc: "System configurations" },
                { href: "/guide", label: "Calculation Guide", icon: HelpCircle, desc: "Formulas & math rules" },
              ].map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SheetClose
                    key={item.href}
                    render={
                      <Link
                        href={item.href}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                          isActive
                            ? "border-primary/20 bg-primary/5 text-foreground"
                            : "border-white/5 hover:bg-white/5 text-muted-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4.5 h-4.5 mb-1.5", isActive ? "text-primary" : "text-foreground")} />
                        <span className="font-semibold text-xs text-foreground block">{item.label}</span>
                        <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</span>
                      </Link>
                    }
                  />
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
