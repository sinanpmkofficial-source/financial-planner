import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  selectedMonth: number;
  selectedYear: number;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  setMonthYear: (month: number, year: number) => void;
}

const now = new Date();

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  selectedMonth: now.getMonth() + 1,
  selectedYear: now.getFullYear(),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMonth: (month) => set({ selectedMonth: month }),
  setYear: (year) => set({ selectedYear: year }),
  setMonthYear: (month, year) =>
    set({ selectedMonth: month, selectedYear: year }),
}));
