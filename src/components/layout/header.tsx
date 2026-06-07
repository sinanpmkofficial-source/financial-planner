"use client";

import { DatePeriodFilter } from "@/components/layout/month-year-picker";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  showMonthPicker?: boolean;
}

export function PageHeader({
  title,
  description,
  action,
  showMonthPicker = false,
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between bg-background/80 backdrop-blur-md py-3.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border/10 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {showMonthPicker && (
          <div className="lg:hidden">
            <DatePeriodFilter />
          </div>
        )}
        {action}
      </div>
    </div>
  );
}
