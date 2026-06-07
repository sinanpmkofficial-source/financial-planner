export const CURRENCY_SYMBOL = "₹";

export const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Rent",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Food: "Utensils",
  Travel: "Plane",
  Rent: "Home",
  Shopping: "ShoppingBag",
  Bills: "Receipt",
  Health: "HeartPulse",
  Education: "GraduationCap",
  Other: "FolderOpen",
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: "hsl(24, 70%, 50%)",
  Travel: "hsl(210, 70%, 50%)",
  Rent: "hsl(150, 60%, 40%)",
  Shopping: "hsl(330, 65%, 50%)",
  Bills: "hsl(45, 70%, 50%)",
  Health: "hsl(0, 65%, 50%)",
  Education: "hsl(270, 60%, 50%)",
  Other: "hsl(200, 15%, 50%)",
};

export const XP_LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 1000 },
  { level: 6, xpRequired: 2000 },
  { level: 7, xpRequired: 3500 },
  { level: 8, xpRequired: 5000 },
  { level: 9, xpRequired: 7500 },
  { level: 10, xpRequired: 10000 },
] as const;

export const XP_REWARDS = {
  LOG_EXPENSE: 5,
  LOG_INCOME: 10,
  STAY_IN_BUDGET: 20,
} as const;

export const BORROW_LEND_TYPES = ["borrowed", "lent"] as const;
export const BORROW_LEND_STATUSES = ["pending", "settled"] as const;

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
