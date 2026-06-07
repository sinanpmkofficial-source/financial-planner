"use server";

import { dbConnect } from "@/lib/db";
import Budget from "@/models/budget";
import Expense from "@/models/expense";
import { budgetSchema, type BudgetFormData } from "@/validations/budget";
import { getMonthDateRange, serializeDoc } from "@/lib/format";
import { revalidatePath } from "next/cache";
import type { Budget as BudgetType, BudgetWithSpent } from "@/types";

export async function getBudgets(
  month: number,
  year: number
): Promise<BudgetType[]> {
  await dbConnect();
  const docs = await Budget.find({ month, year }).sort({ category: 1 }).lean();
  return serializeDoc<BudgetType[]>(docs);
}

export async function getBudgetsWithSpent(
  month: number,
  year: number
): Promise<BudgetWithSpent[]> {
  await dbConnect();
  const { start, end } = getMonthDateRange(month, year);

  const budgets = await Budget.find({ month, year }).lean();
  const expensesByCategory = await Expense.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
  ]);

  const spentMap = new Map<string, number>();
  for (const e of expensesByCategory) {
    spentMap.set(e._id, e.total);
  }

  const result: BudgetWithSpent[] = budgets.map((b) => {
    const spent = spentMap.get(b.category) ?? 0;
    const remaining = Math.max(b.amount - spent, 0);
    const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    return {
      ...serializeDoc<BudgetType>(b),
      spent,
      remaining,
      percentage,
    };
  });

  return result;
}

export async function createBudget(
  data: BudgetFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = budgetSchema.parse(data);
    await dbConnect();

    const existing = await Budget.findOne({
      category: parsed.category,
      month: parsed.month,
      year: parsed.year,
    });

    if (existing) {
      return {
        success: false,
        error: `Budget for ${parsed.category} already exists for this month`,
      };
    }

    await Budget.create(parsed);
    revalidatePath("/");
    revalidatePath("/budgets");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create budget",
    };
  }
}

export async function updateBudget(
  id: string,
  data: BudgetFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = budgetSchema.parse(data);
    await dbConnect();
    await Budget.findByIdAndUpdate(id, parsed);
    revalidatePath("/");
    revalidatePath("/budgets");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update budget",
    };
  }
}

export async function deleteBudget(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    await Budget.findByIdAndDelete(id);
    revalidatePath("/");
    revalidatePath("/budgets");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete budget",
    };
  }
}
