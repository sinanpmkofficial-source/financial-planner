"use server";

import { dbConnect } from "@/lib/db";
import Expense from "@/models/expense";
import Income from "@/models/income";
import GoalContribution from "@/models/goal-contribution";
import BorrowLend from "@/models/borrow-lend";
import { endOfMonth, startOfMonth } from "date-fns";
import { computeLiquidCash } from "@/lib/finance";
import { getCurrentUserId } from "@/lib/session";

interface IncomeRecord {
  amount: number;
}

interface ExpenseRecord {
  amount: number;
  category: string;
  tag?: string;
}

interface ContributionRecord {
  amount: number;
}

interface BorrowLendRecord {
  amount: number;
  paidAmount?: number;
}

export async function getFinancialHealthData(month: number, year: number) {
  await dbConnect();
  const userId = await getCurrentUserId();

  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  // Fetch all incomes for the month
  const incomes = await Income.find({
    userId,
    date: { $gte: start, $lte: end },
  }).lean() as unknown as IncomeRecord[];
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  // Fetch all expenses for the month
  const expenses = await Expense.find({
    userId,
    date: { $gte: start, $lte: end },
  }).lean() as unknown as ExpenseRecord[];

  let totalNeeds = 0;
  let totalWants = 0;
  let totalInvestments = 0;
  let totalUnnecessary = 0;
  let rentExpense = 0;

  expenses.forEach((expense) => {
    const tag = expense.tag || "Needs";
    if (tag === "Needs") {
      totalNeeds += expense.amount;
    } else if (tag === "Wants") {
      totalWants += expense.amount;
    } else if (tag === "Investments") {
      totalInvestments += expense.amount;
    } else if (tag === "Unnecessary Spending") {
      totalUnnecessary += expense.amount;
    }
    
    // Check specific rent category
    if (expense.category?.toLowerCase() === "rent") {
      rentExpense += expense.amount;
    }
  });

  // Fetch goal contributions for the month
  const contributions = await GoalContribution.find({
    userId,
    date: { $gte: start, $lte: end },
  }).lean() as unknown as ContributionRecord[];
  const totalGoals = contributions.reduce((sum, item) => sum + item.amount, 0);

  // Total actual expenses logged in the system this month
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Cash left over after expenses and goal contributions
  const unspentCash = Math.max(0, totalIncome - totalExpenses - totalGoals);

  // Savings is Investments + Goal Contributions + remaining cash flow
  const totalSavings = totalInvestments + unspentCash;

  // All-time liquid cash, using the shared canonical definition. Goal money is
  // set aside (not liquid), so all-time goal contributions are subtracted too.
  const allIncomes = await Income.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]) as { total: number }[];
  const allExpenses = await Expense.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]) as { total: number }[];
  const allContributions = await GoalContribution.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]) as { total: number }[];
  const totalLiquidCash = computeLiquidCash({
    totalIncome: allIncomes[0]?.total || 0,
    totalExpenses: allExpenses[0]?.total || 0,
    totalGoalContributions: allContributions[0]?.total || 0,
  });

  // Fetch all outstanding borrowed debts
  const pendingBorrowed = await BorrowLend.find({
    userId,
    type: "borrowed",
    status: "pending"
  }).lean() as unknown as BorrowLendRecord[];
  
  const totalBorrowedPending = pendingBorrowed.reduce(
    (sum, item) => sum + (item.amount - (item.paidAmount || 0)), 
    0
  );

  return {
    totalIncome,
    totalNeeds,
    totalWants,
    totalInvestments,
    totalUnnecessary,
    totalGoals,
    totalSavings,
    rentExpense,
    totalLiquidCash,
    totalBorrowedPending
  };
}