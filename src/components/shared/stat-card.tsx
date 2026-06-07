import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "danger" | "warning";
  index?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
  index,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-foreground/15 rounded-2xl bg-card transition-all duration-300",
        "hover:border-foreground/30 hover:shadow-[4px_4px_0px_var(--foreground)] dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]",
        "group/card flex flex-col justify-between"
      )}
    >
      {/* Top Section */}
      <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
        <div className="flex items-center gap-2">
          {index && (
            <span className="text-[10px] font-mono text-muted-foreground/80 border border-foreground/10 px-1.5 py-0.5 rounded-md">
              {index}
            </span>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-muted/60 border border-foreground/5 text-foreground transition-colors group-hover/card:bg-foreground group-hover/card:text-background">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Ticket Cut / Dashed Line Separator */}
      <div className="relative flex items-center w-full">
        {/* Left Notch */}
        <div className="absolute left-[-8px] w-4 h-4 rounded-full bg-background border-r border-foreground/15 z-10" />
        {/* Dashed Line */}
        <div className="w-full border-t border-dashed border-foreground/15" />
        {/* Right Notch */}
        <div className="absolute right-[-8px] w-4 h-4 rounded-full bg-background border-l border-foreground/15 z-10" />
      </div>

      {/* Bottom Section */}
      <div className="pb-5 px-5 pt-3.5 space-y-1.5">
        <h4 className="text-3xl font-extrabold tracking-tight text-foreground">
          {value}
        </h4>
        {trend && (
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}
