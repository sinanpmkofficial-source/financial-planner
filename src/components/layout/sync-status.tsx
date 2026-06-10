"use client";

import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { CheckCircle2, CloudOff, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

export function SyncStatus() {
  const { syncStatus, dashboardCache } = useUIStore();
  const [lastSyncedText, setLastSyncedText] = useState("");

  useEffect(() => {
    if (!dashboardCache.lastFetched) {
      setLastSyncedText("Never synced");
      return;
    }

    const updateText = () => {
      const seconds = Math.floor((Date.now() - dashboardCache.lastFetched!) / 1000);
      if (seconds < 60) setLastSyncedText("Synced just now");
      else if (seconds < 3600) setLastSyncedText(`Synced ${Math.floor(seconds / 60)}m ago`);
      else setLastSyncedText(`Synced ${Math.floor(seconds / 3600)}h ago`);
    };

    updateText();
    const interval = setInterval(updateText, 60000);
    return () => clearInterval(interval);
  }, [dashboardCache.lastFetched, syncStatus]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-[10px] font-medium text-muted-foreground animate-fade-in">
      {syncStatus === "syncing" && (
        <>
          <RefreshCcw className="w-3 h-3 animate-spin text-primary" />
          <span>Syncing data...</span>
        </>
      )}
      {syncStatus === "synced" && (
        <>
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>{lastSyncedText}</span>
        </>
      )}
      {syncStatus === "error" && (
        <>
          <CloudOff className="w-3 h-3 text-rose-500" />
          <span>Sync error</span>
        </>
      )}
    </div>
  );
}
