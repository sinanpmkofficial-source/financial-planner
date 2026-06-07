import type { ExpenseCategory } from "@/constants";

export interface Expense {
  _id: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  _id: string;
  amount: number;
  source: string;
  note?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowLend {
  _id: string;
  personName: string;
  amount: number;
  type: "borrowed" | "lent";
  date: string;
  dueDate?: string;
  status: "pending" | "settled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  _id: string;
  category: ExpenseCategory;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetWithSpent extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
}

export interface UserStats {
  _id: string;
  totalXp: number;
  level: number;
  lastExpenseDate?: string;
  updatedAt: string;
}

export interface DashboardSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  totalBorrowed: number;
  totalLent: number;
  budgetUsedPercentage: number;
  stats: UserStats;
}

export interface ReportData {
  income: number;
  expenses: number;
  savings: number;
  netBalance: number;
  periodLabel: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface CategoryDistribution {
  category: string;
  amount: number;
  color: string;
}

export interface MonthlyComparison {
  month: string;
  income: number;
  expenses: number;
}

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";
