import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "danger" | "warning";
  index?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
  index,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border/60 rounded-2xl bg-card transition-all duration-300 flex flex-col justify-between group/card",
        "shadow-[0_1px_3px_oklch(0_0_0/6%),0_1px_2px_oklch(0_0_0/4%)] hover:shadow-[0_4px_12px_oklch(0_0_0/8%)] hover:border-border",
        "dark:shadow-[0_1px_3px_oklch(0_0_0/30%)] dark:hover:shadow-[0_4px_14px_oklch(0_0_0/40%)]",
        className
      )}
    >
      {/* Top Section */}
      <div className="flex items-center justify-between gap-2 pb-2.5 px-3.5 pt-3.5 sm:pb-3.5 sm:px-5 sm:pt-5">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {index && (
            <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-1.5 py-0.5 rounded-md shrink-0">
              {index}
            </span>
          )}
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </span>
        </div>
        <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-muted/50 text-muted-foreground transition-all duration-200 group-hover/card:bg-foreground group-hover/card:text-background shrink-0">
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>

      {/* Thin Separator */}
      <div className="w-full border-t border-border/50 border-dashed" />

      {/* Bottom Section */}
      <div className="pb-3.5 px-3.5 pt-2.5 space-y-1 sm:pb-5 sm:px-5 sm:pt-3.5 sm:space-y-1.5">
        <h4 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate">
          {value}
        </h4>
        {trend && (
          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}
