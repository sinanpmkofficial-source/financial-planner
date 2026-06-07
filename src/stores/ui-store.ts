import { create } from "zustand";
import { DateRange } from "react-day-picker";
import {
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
} from "date-fns";

export type PeriodPreset =
  | "Today"
  | "Yesterday"
  | "Last 7 Days"
  | "Last 30 Days"
  | "This Month"
  | "Last Month"
  | "This Year"
  | "Custom";

export function getDateRangeForPreset(preset: string, customRange?: DateRange) {
  const now = new Date();
  switch (preset) {
    case "Today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "Yesterday":
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case "Last 7 Days":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "Last 30 Days":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "This Month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "Last Month":
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case "This Year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "Custom":
      return {
        from: customRange?.from ?? startOfMonth(now),
        to: customRange?.to ?? endOfMonth(now),
      };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

interface UIState {
  sidebarOpen: boolean;
  preset: PeriodPreset;
  customRange: DateRange | undefined;
  dateRange: { from: Date; to: Date };
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (range: DateRange | undefined) => void;
}

const defaultPreset: PeriodPreset = "This Month";
const initialRange = getDateRangeForPreset(defaultPreset);

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  preset: defaultPreset,
  customRange: {
    from: initialRange.from,
    to: initialRange.to,
  },
  dateRange: initialRange,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setPreset: (preset) =>
    set((state) => {
      const dateRange = getDateRangeForPreset(preset, state.customRange);
      return { preset, dateRange };
    }),
  setCustomRange: (customRange) =>
    set((state) => {
      const dateRange = getDateRangeForPreset("Custom", customRange);
      return { customRange, dateRange };
    }),
}));
