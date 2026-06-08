"use server";

import { dbConnect } from "@/lib/db";
import Expense from "@/models/expense";
import Income from "@/models/income";
import UserSettings from "@/models/user-settings";
import GoalContribution from "@/models/goal-contribution";
import { endOfMonth, startOfMonth } from "date-fns";

export async function getFinancialHealthData(month: number, year: number) {
  await dbConnect();

  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  // Fetch all incomes for the month
  const incomes = await Income.find({
    date: { $gte: start, $lte: end },
  }).lean();
  const totalIncome = incomes.reduce((sum, item: any) => sum + item.amount, 0);

  // Fetch settings to map categories to buckets
  const settings = await UserSettings.findOne().lean();
  const categoryBuckets = new Map<string, string>();
  settings?.categories?.forEach((cat: any) => {
    categoryBuckets.set(cat.name, cat.bucket || "Other");
  });

  // Fetch all expenses for the month
  const expenses = await Expense.find({
    date: { $gte: start, $lte: end },
  }).lean();

  let totalNeeds = 0;
  let totalFun = 0;
  let totalInvestments = 0;
  let rentExpense = 0;

  expenses.forEach((expense: any) => {
    const bucket = categoryBuckets.get(expense.category) || "Other";
    if (bucket === "Needs") totalNeeds += expense.amount;
    if (bucket === "Fun") totalFun += expense.amount;
    if (bucket === "Investments") totalInvestments += expense.amount;
    
    // Check specific rent rule
    if (expense.category.toLowerCase() === "rent") {
      rentExpense += expense.amount;
    }
  });

  // Fetch goal contributions for the month
  const contributions = await GoalContribution.find({
    date: { $gte: start, $lte: end },
  }).lean();
  const totalGoals = contributions.reduce((sum, item: any) => sum + item.amount, 0);

  // Calculate Unspent / True Savings
  const totalExpenses = totalNeeds + totalFun + totalInvestments + expenses.filter((e:any) => (categoryBuckets.get(e.category) || "Other") === "Other").reduce((s:number, e:any) => s+e.amount, 0);
  // Goals are technically savings, but we separate them for the 15% rule. 
  // Investments + whatever cash is left over (Income - Expenses - Goal contributions) = Savings bucket (25%)
  const unspentCash = Math.max(0, totalIncome - totalExpenses - totalGoals);
  const totalSavings = totalInvestments + unspentCash;

  // Liquid Cash Check (for emergency fund rule)
  // Approximate total net balance across all time
  const allIncomes = await Income.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
  const allExpenses = await Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
  const totalLiquidCash = (allIncomes[0]?.total || 0) - (allExpenses[0]?.total || 0);

  return {
    totalIncome,
    totalNeeds,
    totalFun,
    totalGoals,
    totalSavings,
    rentExpense,
    totalLiquidCash
  };
}