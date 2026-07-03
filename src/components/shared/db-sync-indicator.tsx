"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncStatus = "checking" | "connected" | "error";

export function DbSyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>("checking");

  const check = async () => {
    setStatus("checking");
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      setStatus(res.ok ? "connected" : "error");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  const label =
    status === "checking"
      ? "Connecting…"
      : status === "connected"
      ? "Synced"
      : "DB Offline";

  return (
    <button
      onClick={check}
      title={label}
      className="flex items-center gap-1.5 cursor-pointer group"
    >
      {status === "error" ? (
        <CloudOff
          className="w-4 h-4 text-rose-500"
        />
      ) : (
        <Cloud
          className={cn(
            "w-4 h-4 transition-colors duration-300",
            status === "checking" && "text-amber-400 animate-pulse",
            status === "connected" && "text-emerald-500"
          )}
        />
      )}

      {/* Label on hover */}
      <span
        className={cn(
          "text-[10px] font-semibold hidden group-hover:inline transition-all",
          status === "connected" && "text-emerald-500",
          status === "checking" && "text-amber-400",
          status === "error" && "text-rose-500"
        )}
      >
        {label}
      </span>
    </button>
  );
}

