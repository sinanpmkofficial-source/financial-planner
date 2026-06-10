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

export type SyncStatus = "synced" | "syncing" | "error";

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
  syncStatus: SyncStatus;
  dashboardCache: {
    summary: any | null;
    expenses: any[];
    incomes: any[];
    budgets: any[];
    chartData: any[];
    settings: any | null;
    recurringExpenses: any[];
    lastFetched?: number;
  };
  
  // More generic cache for other pages
  transactionsCache: {
    data: any[];
    lastFetched?: number;
  };
  budgetsCache: {
    data: any[];
    lastFetched?: number;
  };

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (range: DateRange | undefined) => void;
  
  // Cache Actions
  setDashboardDirty: (dirty: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  updateDashboardCache: (data: Partial<UIState["dashboardCache"]>) => void;
  updateTransactionsCache: (data: any[]) => void;
  updateBudgetsCache: (data: any[]) => void;
  
  // Optimistic Actions
  addOptimisticTransaction: (transaction: any) => void;
  
  clearCache: () => void;
}

const defaultPreset: PeriodPreset = "This Month";
const initialRange = getDateRangeForPreset(defaultPreset);

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
      syncStatus: "synced",
      dashboardCache: {
        summary: null,
        expenses: [],
        incomes: [],
        budgets: [],
        chartData: [],
        settings: null,
        recurringExpenses: [],
      },
      transactionsCache: {
        data: [],
      },
      budgetsCache: {
        data: [],
      },

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
      setSyncStatus: (status) => set({ syncStatus: status }),
      updateDashboardCache: (data) => 
        set((state) => ({
          dashboardCache: { ...state.dashboardCache, ...data, lastFetched: Date.now() },
          syncStatus: "synced"
        })),
      updateTransactionsCache: (data) =>
        set({ transactionsCache: { data, lastFetched: Date.now() }, syncStatus: "synced" }),
      updateBudgetsCache: (data) =>
        set({ budgetsCache: { data, lastFetched: Date.now() }, syncStatus: "synced" }),
      
      addOptimisticTransaction: (t) =>
        set((state) => {
          const isExp = "category" in t;
          const newExpenses = isExp ? [t, ...state.dashboardCache.expenses].slice(0, 5) : state.dashboardCache.expenses;
          const newIncomes = !isExp ? [t, ...state.dashboardCache.incomes].slice(0, 5) : state.dashboardCache.incomes;
          
          return {
            dashboardCache: {
              ...state.dashboardCache,
              expenses: newExpenses,
              incomes: newIncomes,
            },
            transactionsCache: {
              ...state.transactionsCache,
              data: [t, ...state.transactionsCache.data]
            },
            syncStatus: "syncing"
          };
        }),

      clearCache: () => set({
        dashboardCache: {
          summary: null,
          expenses: [],
          incomes: [],
          budgets: [],
          chartData: [],
          settings: null,
          recurringExpenses: [],
        },
        transactionsCache: { data: [] },
        budgetsCache: { data: [] }
      }),
    }),
    {
      name: "money-management-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        dashboardCache: state.dashboardCache,
        transactionsCache: state.transactionsCache,
        budgetsCache: state.budgetsCache,
        preset: state.preset,
        customRange: state.customRange,
        dateRange: state.dateRange,
      }),
    }
  )
);
