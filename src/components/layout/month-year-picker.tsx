"use client";

import { useUIStore, type PeriodPreset } from "@/stores/ui-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { format } from "date-fns";

export function DatePeriodFilter() {
  const { preset, setPreset, dateRange, setCustomRange, customRange } = useUIStore();

  return (
    <div className="space-y-3 p-1">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Filter Period
        </label>
        <Select value={preset} onValueChange={(val) => setPreset(val as PeriodPreset)}>
          <SelectTrigger className="h-9 text-xs w-full bg-background rounded-xl border-border/50">
            <SelectValue placeholder="Select Period" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="Today">Today</SelectItem>
            <SelectItem value="Yesterday">Yesterday</SelectItem>
            <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
            <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
            <SelectItem value="This Month">This Month</SelectItem>
            <SelectItem value="Last Month">Last Month</SelectItem>
            <SelectItem value="This Year">This Year</SelectItem>
            <SelectItem value="Custom">📅 Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {preset === "Custom" && (
        <div className="space-y-1.5 animate-in fade-in-0 duration-200">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Date Range
          </label>
          <DateRangePicker
            date={customRange}
            setDate={(range) => {
              if (range) {
                setCustomRange(range);
              }
            }}
            className="w-full"
          />
        </div>
      )}
      
      {preset !== "Custom" && (
        <p className="text-[10px] text-muted-foreground/80 font-medium px-0.5">
          {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
        </p>
      )}
    </div>
  );
}

// Retain alias for backwards compatibility during migration
export { DatePeriodFilter as MonthYearPicker };
