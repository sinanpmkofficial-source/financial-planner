"use client";

import { Progress } from "@/components/ui/progress";
import { getXpProgress, getXpForNextLevel } from "@/lib/xp";
import type { UserStats } from "@/types";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface XpCardProps {
  stats: UserStats;
}

export function XpCard({ stats }: XpCardProps) {
  const progress = getXpProgress(stats.totalXp);
  const nextLevelXp = getXpForNextLevel(stats.level);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-foreground/15 rounded-2xl bg-card transition-all duration-300",
        "hover:border-foreground/30 hover:shadow-[4px_4px_0px_var(--foreground)] dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]",
        "flex flex-col justify-between"
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
      </div>
    </div>
  );
}
