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
  month: number,
  year: number
): Promise<DashboardSummary> {
  await dbConnect();
  const { start, end } = getMonthDateRange(month, year);

  const [incomeAgg, expenseAgg, borrowLendRecords, budgets, stats] =
    await Promise.all([
      Income.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      BorrowLend.find({ status: "pending" }).lean(),
      Budget.find({ month, year }).lean(),
      getOrCreateStats(),
    ]);

  const monthlyIncome = incomeAgg[0]?.total ?? 0;
  const monthlyExpenses = expenseAgg[0]?.total ?? 0;
  const savings = monthlyIncome - monthlyExpenses;
  const currentBalance = savings;

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
  };
}
