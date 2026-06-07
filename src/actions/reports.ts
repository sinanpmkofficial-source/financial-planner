"use server";

import { dbConnect } from "@/lib/db";
import Expense from "@/models/expense";
import Income from "@/models/income";
import UserSettings from "@/models/user-settings";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns";
import type {
  ReportData,
  ReportPeriod,
  ChartDataPoint,
  CategoryDistribution,
  MonthlyComparison,
} from "@/types";
import { CATEGORY_COLORS, type ExpenseCategory } from "@/constants";

export async function getReport(
  period: ReportPeriod,
  date: Date,
  category?: string
): Promise<ReportData> {
  await dbConnect();

  let start: Date;
  let end: Date;
  let periodLabel: string;

  switch (period) {
    case "daily":
      start = startOfDay(date);
      end = endOfDay(date);
      periodLabel = format(date, "dd/MM/yyyy");
      break;
    case "weekly":
      start = startOfWeek(date, { weekStartsOn: 1 });
      end = endOfWeek(date, { weekStartsOn: 1 });
      periodLabel = `${format(start, "dd/MM")} - ${format(end, "dd/MM/yyyy")}`;
      break;
    case "monthly":
      start = startOfMonth(date);
      end = endOfMonth(date);
      periodLabel = format(date, "MMMM yyyy");
      break;
    case "yearly":
      start = startOfYear(date);
      end = endOfYear(date);
      periodLabel = format(date, "yyyy");
      break;
  }

  const isCategoryFilter = category && category.toLowerCase() !== "all";

  // Build match filters
  const expenseMatch: any = { date: { $gte: start, $lte: end } };
  if (isCategoryFilter) {
    expenseMatch.category = category;
  }

  const incomeMatch = { date: { $gte: start, $lte: end } };

  const [incomeAgg, expenseAgg] = await Promise.all([
    isCategoryFilter
      ? Promise.resolve([{ total: 0 }]) // Force income to 0 when filtering by expense category
      : Income.aggregate([
          { $match: incomeMatch },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
    Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const income = incomeAgg[0]?.total ?? 0;
  const expenses = expenseAgg[0]?.total ?? 0;

  return {
    income,
    expenses,
    savings: income - expenses,
    netBalance: income - expenses,
    periodLabel,
  };
}

export async function getExpenseTrend(
  month: number,
  year: number,
  category?: string,
  period: "monthly" | "yearly" = "monthly"
): Promise<ChartDataPoint[]> {
  await dbConnect();

  const isCategoryFilter = category && category.toLowerCase() !== "all";

  if (period === "monthly") {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });

    const matchQuery: any = { date: { $gte: start, $lte: end } };
    if (isCategoryFilter) {
      matchQuery.category = category;
    }

    const expenses = await Expense.find(matchQuery).lean();

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const total = expenses
        .filter((e) => {
          const d = new Date(e.date);
          return d >= dayStart && d <= dayEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return { label: format(day, "dd"), value: total };
    });
  } else {
    // Yearly trend - group by month (Jan - Dec)
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));
    
    const matchQuery: any = { date: { $gte: start, $lte: end } };
    if (isCategoryFilter) {
      matchQuery.category = category;
    }

    const expenses = await Expense.find(matchQuery).lean();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    return months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const total = expenses
        .filter((e) => {
          const d = new Date(e.date);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return { label: format(m, "MMM"), value: total };
    });
  }
}

export async function getIncomeTrend(
  month: number,
  year: number,
  period: "monthly" | "yearly" = "monthly"
): Promise<ChartDataPoint[]> {
  await dbConnect();

  if (period === "monthly") {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });

    const incomes = await Income.find({
      date: { $gte: start, $lte: end },
    }).lean();

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const total = incomes
        .filter((i) => {
          const d = new Date(i.date);
          return d >= dayStart && d <= dayEnd;
        })
        .reduce((sum, i) => sum + i.amount, 0);
      return { label: format(day, "dd"), value: total };
    });
  } else {
    // Yearly trend - group by month (Jan - Dec)
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));

    const incomes = await Income.find({
      date: { $gte: start, $lte: end },
    }).lean();
    
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    return months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const total = incomes
        .filter((i) => {
          const d = new Date(i.date);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, i) => sum + i.amount, 0);
      return { label: format(m, "MMM"), value: total };
    });
  }
}

export async function getSavingsTrend(
  category?: string,
  period: "monthly" | "yearly" = "monthly"
): Promise<ChartDataPoint[]> {
  await dbConnect();
  
  const isCategoryFilter = category && category.toLowerCase() !== "all";

  if (period === "monthly") {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now,
    });

    const result: ChartDataPoint[] = [];
    for (const m of months) {
      const start = startOfMonth(m);
      const end = endOfMonth(m);

      const expenseMatch: any = { date: { $gte: start, $lte: end } };
      if (isCategoryFilter) {
        expenseMatch.category = category;
      }

      const [incomeAgg, expenseAgg] = await Promise.all([
        isCategoryFilter
          ? Promise.resolve([{ total: 0 }]) // Income is treated as 0 for category-specific savings trend
          : Income.aggregate([
              { $match: { date: { $gte: start, $lte: end } } },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
        Expense.aggregate([
          { $match: expenseMatch },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

      result.push({
        label: format(m, "MMM"),
        value: (incomeAgg[0]?.total ?? 0) - (expenseAgg[0]?.total ?? 0),
      });
    }
    return result;
  } else {
    // Yearly view - Savings trend for the last 5 years
    const now = new Date();
    const currentYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

    const result: ChartDataPoint[] = [];
    for (const y of years) {
      const start = startOfYear(new Date(y, 0, 1));
      const end = endOfYear(new Date(y, 0, 1));

      const expenseMatch: any = { date: { $gte: start, $lte: end } };
      if (isCategoryFilter) {
        expenseMatch.category = category;
      }

      const [incomeAgg, expenseAgg] = await Promise.all([
        isCategoryFilter
          ? Promise.resolve([{ total: 0 }])
          : Income.aggregate([
              { $match: { date: { $gte: start, $lte: end } } },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
        Expense.aggregate([
          { $match: expenseMatch },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

      result.push({
        label: String(y),
        value: (incomeAgg[0]?.total ?? 0) - (expenseAgg[0]?.total ?? 0),
      });
    }
    return result;
  }
}

export async function getMonthlyComparison(
  category?: string,
  period: "monthly" | "yearly" = "monthly"
): Promise<MonthlyComparison[]> {
  await dbConnect();

  const isCategoryFilter = category && category.toLowerCase() !== "all";

  if (period === "monthly") {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now,
    });

    const result: MonthlyComparison[] = [];
    for (const m of months) {
      const start = startOfMonth(m);
      const end = endOfMonth(m);

      const expenseMatch: any = { date: { $gte: start, $lte: end } };
      if (isCategoryFilter) {
        expenseMatch.category = category;
      }

      const [incomeAgg, expenseAgg] = await Promise.all([
        isCategoryFilter
          ? Promise.resolve([{ total: 0 }])
          : Income.aggregate([
              { $match: { date: { $gte: start, $lte: end } } },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
        Expense.aggregate([
          { $match: expenseMatch },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

      result.push({
        month: format(m, "MMM"),
        income: incomeAgg[0]?.total ?? 0,
        expenses: expenseAgg[0]?.total ?? 0,
      });
    }
    return result;
  } else {
    // Yearly view - Comparison for the last 5 years
    const now = new Date();
    const currentYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

    const result: MonthlyComparison[] = [];
    for (const y of years) {
      const start = startOfYear(new Date(y, 0, 1));
      const end = endOfYear(new Date(y, 0, 1));

      const expenseMatch: any = { date: { $gte: start, $lte: end } };
      if (isCategoryFilter) {
        expenseMatch.category = category;
      }

      const [incomeAgg, expenseAgg] = await Promise.all([
        isCategoryFilter
          ? Promise.resolve([{ total: 0 }])
          : Income.aggregate([
              { $match: { date: { $gte: start, $lte: end } } },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
        Expense.aggregate([
          { $match: expenseMatch },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

      result.push({
        month: String(y),
        income: incomeAgg[0]?.total ?? 0,
        expenses: expenseAgg[0]?.total ?? 0,
      });
    }
    return result;
  }
}

export async function getCategoryDistribution(
  month: number,
  year: number,
  period: "monthly" | "yearly" = "monthly"
): Promise<CategoryDistribution[]> {
  await dbConnect();
  
  let start: Date;
  let end: Date;

  if (period === "monthly") {
    start = startOfMonth(new Date(year, month - 1));
    end = endOfMonth(new Date(year, month - 1));
  } else {
    start = startOfYear(new Date(year, 0, 1));
    end = endOfYear(new Date(year, 0, 1));
  }

  const result = await Expense.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
  ]);

  // Fallback to random colors if category does not have a mapped color in settings
  // E.g. query dynamic settings to map colors correctly
  const settings = await UserSettings.findOne().lean();
  const catColorMap: Record<string, string> = {};
  if (settings && settings.categories) {
    settings.categories.forEach((cat: any) => {
      catColorMap[cat.name] = cat.color;
    });
  }

  return result.map((r: { _id: string; total: number }) => ({
    category: r._id,
    amount: r.total,
    color: catColorMap[r._id] || CATEGORY_COLORS[r._id as ExpenseCategory] || "hsl(200, 15%, 50%)",
  }));
}
