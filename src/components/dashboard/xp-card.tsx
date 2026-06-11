"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { getXpProgress, getXpForNextLevel } from "@/lib/xp";
import type { UserStats } from "@/types";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/shared/count-up";

interface XpCardProps {
  stats?: UserStats;
  loading?: boolean;
}

export function XpCard({ stats, loading = false }: XpCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const progress = stats ? getXpProgress(stats.totalXp) : 0;
  const nextLevelXp = stats ? getXpForNextLevel(stats.level) : 100;

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border/60 rounded-2xl bg-card transition-all duration-300 flex flex-col justify-between",
        "shadow-[0_1px_3px_oklch(0_0_0/6%),0_1px_2px_oklch(0_0_0/4%)] hover:shadow-[0_4px_12px_oklch(0_0_0/8%)] hover:border-border",
        "dark:shadow-[0_1px_3px_oklch(0_0_0/30%)] dark:hover:shadow-[0_4px_14px_oklch(0_0_0/40%)]"
      )}
    >
      {/* Top Section */}
      <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-1.5 py-0.5 rounded-md">
            XP
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Level & XP
          </span>
        </div>
        <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground">
          <Zap className="w-4 h-4" />
        </div>
      </div>

      {/* Thin Separator */}
      <div className="w-full border-t border-border/50 border-dashed" />

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
                Level <CountUp value={stats.level} />
              </h4>
            </div>
            <div className="space-y-2">
              <Progress value={isMounted ? progress : 0} className="h-2" />
              <p className="text-xs text-muted-foreground font-medium">
                <CountUp value={stats.totalXp} /> / <CountUp value={nextLevelXp} /> XP (<CountUp value={progress} />%)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
