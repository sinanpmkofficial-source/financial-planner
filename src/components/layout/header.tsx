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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
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
