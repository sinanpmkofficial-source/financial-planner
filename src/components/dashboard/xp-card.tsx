"use client";

import { Progress } from "@/components/ui/progress";
import { getXpProgress, getXpForNextLevel } from "@/lib/xp";
import type { UserStats } from "@/types";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface XpCardProps {
  stats?: UserStats;
  loading?: boolean;
}

export function XpCard({ stats, loading = false }: XpCardProps) {
  const progress = stats ? getXpProgress(stats.totalXp) : 0;
  const nextLevelXp = stats ? getXpForNextLevel(stats.level) : 100;

  return (
    <div
      className={cn(
        "relative overflow-hidden border rounded-2xl bg-card transition-all duration-300 flex flex-col justify-between",
        "shadow-[4px_4px_0px_var(--foreground)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.85)] border-foreground/30",
        "md:shadow-none md:border-foreground/15 md:hover:border-foreground/30 md:hover:shadow-[4px_4px_0px_var(--foreground)] md:dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]"
      )}
    >
      {/* Top Section */}
      <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground/80 border border-foreground/10 px-1.5 py-0.5 rounded-md">
            03
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Level & XP
          </span>
        </div>
        <div className="p-2 rounded-xl bg-muted/65 border border-foreground/5 text-foreground">
          <Zap className="w-4 h-4" />
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
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        {loading || !stats ? (
          <>
            <div>
              <div className="h-7 w-20 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full animate-pulse" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded-sm" />
            </div>
          </>
        ) : (
          <>
            <div>
              <h4 className="text-xl font-bold text-foreground">
                Level {stats.level}
              </h4>
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground font-medium">
                {stats.totalXp} / {nextLevelXp} XP ({Math.round(progress)}%)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
