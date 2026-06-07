"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getXpProgress, getXpForNextLevel } from "@/lib/xp";
import type { UserStats } from "@/types";
import { Zap } from "lucide-react";

interface XpCardProps {
  stats: UserStats;
}

export function XpCard({ stats }: XpCardProps) {
  const progress = getXpProgress(stats.totalXp);
  const nextLevelXp = getXpForNextLevel(stats.level);

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground font-medium">
              Level & XP
            </p>
            <p className="text-2xl font-bold tracking-tight mt-1">
              Level {stats.level}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-violet-50">
            <Zap className="w-5 h-5 text-violet-600" />
          </div>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.totalXp} / {nextLevelXp} XP
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
