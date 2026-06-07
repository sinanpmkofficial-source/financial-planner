"use server";

import { dbConnect } from "@/lib/db";
import Expense from "@/models/expense";
import Income from "@/models/income";
import UserSettings from "@/models/user-settings";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isYesterday,
  isSameYear,
  startOfYear,
  endOfYear,
} from "date-fns";
import type {
  ReportData,
  ChartDataPoint,
  CategoryDistribution,
} from "@/types";
import { CATEGORY_COLORS, type ExpenseCategory } from "@/constants";
import { utcToLocal, localToUtc } from "@/lib/date-utils";

function formatPeriodLabel(start: Date, end: Date): string {
  if (isSameDay(start, end)) {
    if (isToday(start)) return "Today";
    if (isYesterday(start)) return "Yesterday";
    return format(start, "do MMM yyyy");
  }
  
  if (isSameMonth(start, end) && 
      isSameDay(start, startOfMonth(start)) && 
      isSameDay(end, endOfMonth(end))) {
    return format(start, "MMMM yyyy");
  }

  if (isSameYear(start, end) &&
      isSameDay(start, startOfYear(start)) &&
      isSameDay(end, endOfYear(end))) {
    return format(start, "yyyy");
  }

  return `${format(start, "dd MMM yyyy")} - ${format(end, "dd MMM yyyy")}`;
}

export async function getUnifiedData(
  from: Date,
  to: Date,
  category?: string
): Promise<{
  report: ReportData;
  expenseTrend: ChartDataPoint[];
  incomeTrend: ChartDataPoint[];
  categoryDistribution: CategoryDistribution[];
}> {
  await dbConnect();

  const localStart = startOfDay(utcToLocal(from));
  const localEnd = endOfDay(utcToLocal(to));

  const start = localToUtc(localStart);
  const end = localToUtc(localEnd);

  const isCategoryFilter = category && category.toLowerCase() !== "all";

  // Build match filters
  const expenseMatch: any = { date: { $gte: start, $lte: end } };
  if (isCategoryFilter) {
    expenseMatch.category = category;
  }

  const incomeMatch = { date: { $gte: start, $lte: end } };

  // 1. Basic Report Data
  const [incomeAgg, expenseAgg] = await Promise.all([
    isCategoryFilter
      ? Promise.resolve([{ total: 0 }])
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

  const report: ReportData = {
    income,
    expenses,
    savings: income - expenses,
    netBalance: income - expenses,
    periodLabel: formatPeriodLabel(localStart, localEnd),
  };

  // 2. Expense Trend
  const expensesList = await Expense.find(expenseMatch).lean();
  const incomesList = await Income.find(incomeMatch).lean();

  const days = eachDayOfInterval({ start: localStart, end: localEnd });
  
  const diffDays = days.length;
  
  let expenseTrend: ChartDataPoint[] = [];
  let incomeTrend: ChartDataPoint[] = [];

  if (diffDays === 1) {
    // Hourly view for single day
    const hours = Array.from({ length: 24 }, (_, i) => i);
    expenseTrend = hours.map((h) => {
      const total = expensesList
        .filter((e) => utcToLocal(e.date).getHours() === h)
        .reduce((sum, e) => sum + e.amount, 0);
      return { label: `${h.toString().padStart(2, "0")}:00`, value: total };
    });

    incomeTrend = hours.map((h) => {
      const total = incomesList
        .filter((i) => utcToLocal(i.date).getHours() === h)
        .reduce((sum, i) => sum + i.amount, 0);
      return { label: `${h.toString().padStart(2, "0")}:00`, value: total };
    });
  } else if (diffDays <= 31) {
    expenseTrend = days.map((day) => {
      const dStart = startOfDay(day);
      const dEnd = endOfDay(day);
      const total = expensesList
        .filter((e) => {
          const d = utcToLocal(e.date);
          return d >= dStart && d <= dEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return { label: format(day, "dd MMM"), value: total };
    });

    incomeTrend = days.map((day) => {
      const dStart = startOfDay(day);
      const dEnd = endOfDay(day);
      const total = incomesList
        .filter((i) => {
          const d = utcToLocal(i.date);
          return d >= dStart && d <= dEnd;
        })
        .reduce((sum, i) => sum + i.amount, 0);
      return { label: format(day, "dd MMM"), value: total };
    });
  } else {
    // Group by month
    const months = eachMonthOfInterval({ start: localStart, end: localEnd });
    expenseTrend = months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const total = expensesList
        .filter((e) => {
          const d = utcToLocal(e.date);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return { label: format(m, "MMM yyyy"), value: total };
    });

    incomeTrend = months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const total = incomesList
        .filter((i) => {
          const d = utcToLocal(i.date);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, i) => sum + i.amount, 0);
      return { label: format(m, "MMM yyyy"), value: total };
    });
  }

  // 3. Category Distribution
  const categoryAgg = await Expense.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
  ]);

  const settings = await UserSettings.findOne().lean();
  const catColorMap: Record<string, string> = {};
  if (settings && settings.categories) {
    settings.categories.forEach((cat: any) => {
      catColorMap[cat.name] = cat.color;
    });
  }

  const categoryDistribution = categoryAgg.map((r: { _id: string; total: number }) => ({
    category: r._id,
    amount: r.total,
    color: catColorMap[r._id] || CATEGORY_COLORS[r._id as ExpenseCategory] || "hsl(200, 15%, 50%)",
  }));

  return {
    report,
    expenseTrend,
    incomeTrend,
    categoryDistribution,
  };
}
