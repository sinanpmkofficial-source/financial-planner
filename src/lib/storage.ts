/**
 * Simple wrapper for localStorage with type safety and error handling
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  },

  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },

  clear: (): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  },
};

export const CACHE_KEYS = {
  DASHBOARD_SUMMARY: "cache_dashboard_summary",
  RECENT_EXPENSES: "cache_recent_expenses",
  RECENT_INCOMES: "cache_recent_incomes",
  BUDGETS: "cache_budgets",
  USER_SETTINGS: "cache_user_settings",
  RECURRING_EXPENSES: "cache_recurring_expenses",
  DASHBOARD_TREND: "cache_dashboard_trend",
  LAST_SYNC: "cache_last_sync",
};
