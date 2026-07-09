"use client";

import { DatePeriodFilter } from "@/components/layout/month-year-picker";
import { DbSyncIndicator } from "@/components/shared/db-sync-indicator";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Compact control rendered inline, right next to the heading (space-saving). */
  titleAction?: React.ReactNode;
  showMonthPicker?: boolean;
}

export function PageHeader({
  title,
  description,
  action,
  titleAction,
  showMonthPicker = false,
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between bg-background/80 backdrop-blur-md py-3.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border/10 mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {titleAction}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
          {/* Sync indicator lives here on mobile (the mobile top bar is removed to save space) */}
          <span className="lg:hidden inline-flex items-center">
            <DbSyncIndicator />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {showMonthPicker && <DatePeriodFilter />}
        {action}
      </div>
    </div>
  );
}
