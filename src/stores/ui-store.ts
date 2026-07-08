import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
  
  // Dashboard Cache & Optimization
  isDashboardDirty: boolean;
  dashboardCache: {
    summary: any | null;
    expenses: any[];
    incomes: any[];
    budgets: any[];
    chartData: any[];
    categorySpend: any[];
    settings: any | null;
    recurringExpenses: any[];
    lastFetched?: number;
  };

  // Screen-specific caches for offline and background sync
  expensesCache: Record<string, any[]>;
  incomesCache: Record<string, any[]>;
  budgetsCache: Record<string, any[]>;
  goalsCache: any[];
  borrowLendCache: any[];
  settingsCache: any | null;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (range: DateRange | undefined) => void;
  
  // Cache Actions
  setDashboardDirty: (dirty: boolean) => void;
  updateDashboardCache: (data: Partial<UIState["dashboardCache"]>) => void;
  updateExpensesCache: (key: string, data: any[]) => void;
  updateIncomesCache: (key: string, data: any[]) => void;
  updateBudgetsCache: (key: string, data: any[]) => void;
  updateGoalsCache: (data: any[]) => void;
  updateBorrowLendCache: (data: any[]) => void;
  updateSettingsCache: (data: any) => void;
}

const defaultPreset: PeriodPreset = "This Month";
const initialRange = getDateRangeForPreset(defaultPreset);

const isDateString = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value);

const reviver = (key: string, value: unknown) => {
  if (isDateString(value)) {
    return new Date(value);
  }
  return value;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      preset: defaultPreset,
      customRange: {
        from: initialRange.from,
        to: initialRange.to,
      },
      dateRange: initialRange,
      
      // Cache Initial State
      isDashboardDirty: true,
      dashboardCache: {
        summary: null,
        expenses: [],
        incomes: [],
        budgets: [],
        chartData: [],
        categorySpend: [],
        settings: null,
        recurringExpenses: [],
      },

      // Screen Cache Initial State
      expensesCache: {},
      incomesCache: {},
      budgetsCache: {},
      goalsCache: [],
      borrowLendCache: [],
      settingsCache: null,

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

      // Cache Actions Implementation
      setDashboardDirty: (dirty) => set({ isDashboardDirty: dirty }),
      updateDashboardCache: (data) => 
        set((state) => ({
          dashboardCache: { ...state.dashboardCache, ...data, lastFetched: Date.now() }
        })),
      updateExpensesCache: (key, data) =>
        set((state) => ({
          expensesCache: { ...state.expensesCache, [key]: data }
        })),
      updateIncomesCache: (key, data) =>
        set((state) => ({
          incomesCache: { ...state.incomesCache, [key]: data }
        })),
      updateBudgetsCache: (key, data) =>
        set((state) => ({
          budgetsCache: { ...state.budgetsCache, [key]: data }
        })),
      updateGoalsCache: (data) => set({ goalsCache: data }),
      updateBorrowLendCache: (data) => set({ borrowLendCache: data }),
      updateSettingsCache: (data) => set({ settingsCache: data }),
    }),
    {
      name: "finance-tracker-ui-store",
      storage: createJSONStorage(() => localStorage, { reviver }),
    }
  )
);
