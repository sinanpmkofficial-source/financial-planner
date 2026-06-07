"use server";

import { dbConnect } from "@/lib/db";
import UserStatsModel from "@/models/user-stats";
import Expense from "@/models/expense";
import Income from "@/models/income";
import BorrowLend from "@/models/borrow-lend";
import Budget from "@/models/budget";
import { calculateLevel } from "@/lib/xp";
import { getMonthDateRange, serializeDoc } from "@/lib/format";
import type { UserStats, DashboardSummary } from "@/types";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns";

async function getOrCreateStats() {
  await dbConnect();
  let stats = await UserStatsModel.findOne();
  if (!stats) {
    stats = await UserStatsModel.create({ totalXp: 0, level: 1 });
  }
  return stats;
}

export async function getUserStats(): Promise<UserStats> {
  const stats = await getOrCreateStats();
  return serializeDoc<UserStats>(stats);
}

export async function awardXp(amount: number): Promise<void> {
  const stats = await getOrCreateStats();
  stats.totalXp += amount;
  stats.level = calculateLevel(stats.totalXp);
  stats.lastExpenseDate = new Date();
  await stats.save();
}

export async function getDashboardSummary(
  month?: number,
  year?: number
): Promise<DashboardSummary> {
  await dbConnect();
  
  const now = new Date();
  const currentMonth = month ?? (now.getMonth() + 1);
  const currentYear = year ?? now.getFullYear();

  // Define ranges
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const { start: monthStart, end: monthEnd } = getMonthDateRange(currentMonth, currentYear);

  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const [
    allIncomeAgg,
    allExpenseAgg,
    todayIncomeAgg,
    todayExpenseAgg,
    weekIncomeAgg,
    weekExpenseAgg,
    monthIncomeAgg,
    monthExpenseAgg,
    yearIncomeAgg,
    yearExpenseAgg,
    borrowLendRecords,
    budgets,
    stats,
  ] = await Promise.all([
    Income.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    
    Income.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    Income.aggregate([
      { $match: { date: { $gte: weekStart, $lte: weekEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: weekStart, $lte: weekEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    Income.aggregate([
      { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    Income.aggregate([
      { $match: { date: { $gte: yearStart, $lte: yearEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: yearStart, $lte: yearEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    BorrowLend.find({ status: "pending" }).lean(),
    Budget.find({ month: currentMonth, year: currentYear }).lean(),
    getOrCreateStats(),
  ]);

  const allIncome = allIncomeAgg[0]?.total ?? 0;
  const allExpense = allExpenseAgg[0]?.total ?? 0;
  const currentBalance = allIncome - allExpense;

  const monthlyIncome = monthIncomeAgg[0]?.total ?? 0;
  const monthlyExpenses = monthExpenseAgg[0]?.total ?? 0;
  const savings = monthlyIncome - monthlyExpenses;

  const todayIncome = todayIncomeAgg[0]?.total ?? 0;
  const todayExpenses = todayExpenseAgg[0]?.total ?? 0;

  const weekIncome = weekIncomeAgg[0]?.total ?? 0;
  const weekExpenses = weekExpenseAgg[0]?.total ?? 0;

  const yearIncome = yearIncomeAgg[0]?.total ?? 0;
  const yearExpenses = yearExpenseAgg[0]?.total ?? 0;

  let totalBorrowed = 0;
  let totalLent = 0;
  for (const r of borrowLendRecords) {
    const remaining = r.amount - (r.paidAmount ?? 0);
    if (r.type === "borrowed") totalBorrowed += remaining;
    else totalLent += remaining;
  }

  const totalBudget = budgets.reduce(
    (sum: number, b: { amount: number }) => sum + b.amount,
    0
  );
  const budgetUsedPercentage =
    totalBudget > 0 ? Math.round((monthlyExpenses / totalBudget) * 100) : 0;

  return {
    currentBalance,
    monthlyIncome,
    monthlyExpenses,
    savings,
    totalBorrowed,
    totalLent,
    budgetUsedPercentage,
    stats: serializeDoc<UserStats>(stats),
    todayIncome,
    todayExpenses,
    weekIncome,
    weekExpenses,
    yearIncome,
    yearExpenses,
  };
}
