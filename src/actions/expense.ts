"use server";

import { dbConnect } from "@/lib/db";
import Expense from "@/models/expense";
import { expenseSchema, type ExpenseFormData } from "@/validations/expense";
import { getCurrentUserId } from "@/lib/session";
import { getMonthDateRange, serializeDoc } from "@/lib/format";
import { awardXp } from "@/actions/stats";
import { XP_REWARDS } from "@/constants";
import { revalidatePath } from "next/cache";
import type { Expense as ExpenseType } from "@/types";

export async function getExpenses(
  month: number,
  year: number
): Promise<ExpenseType[]> {
  await dbConnect();
  const userId = await getCurrentUserId();
  const { start, end } = getMonthDateRange(month, year);
  const docs = await Expense.find({ userId, date: { $gte: start, $lte: end } })
    .sort({ date: -1 })
    .lean();
  return serializeDoc<ExpenseType[]>(docs);
}

export async function getExpensesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<ExpenseType[]> {
  await dbConnect();
  const userId = await getCurrentUserId();
  const docs = await Expense.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: -1 })
    .lean();
  return serializeDoc<ExpenseType[]>(docs);
}

export async function getRecentExpenses(limit = 5): Promise<ExpenseType[]> {
  await dbConnect();
  const userId = await getCurrentUserId();
  const docs = await Expense.find({ userId }).sort({ date: -1 }).limit(limit).lean();
  return serializeDoc<ExpenseType[]>(docs);
}

export async function createExpense(
  data: ExpenseFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = expenseSchema.parse(data);
    await dbConnect();
    const userId = await getCurrentUserId();
    await Expense.create({ ...parsed, userId, date: new Date(parsed.date) });
    await awardXp(XP_REWARDS.LOG_EXPENSE);
    revalidatePath("/");
    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create expense",
    };
  }
}

export async function updateExpense(
  id: string,
  data: ExpenseFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = expenseSchema.parse(data);
    await dbConnect();
    const userId = await getCurrentUserId();

    const updatePayload: {
      amount: number;
      category: string;
      tag: ExpenseFormData["tag"];
      note?: string;
      date: Date;
      recurringExpenseId?: string | null;
    } = {
      amount: parsed.amount,
      category: parsed.category,
      tag: parsed.tag,
      note: parsed.note,
      date: new Date(parsed.date),
    };

    if (parsed.recurringExpenseId !== undefined) {
      updatePayload.recurringExpenseId = parsed.recurringExpenseId || null;
    }

    const updated = await Expense.findOneAndUpdate({ _id: id, userId }, updatePayload);
    if (!updated) {
      return { success: false, error: "Expense not found" };
    }
    revalidatePath("/");
    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update expense",
    };
  }
}

export async function deleteExpense(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const userId = await getCurrentUserId();
    const deleted = await Expense.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return { success: false, error: "Expense not found" };
    }
    revalidatePath("/");
    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete expense",
    };
  }
}

export async function getExpenseTotals(month: number, year: number) {
  await dbConnect();
  const userId = await getCurrentUserId();
  const { start, end } = getMonthDateRange(month, year);
  const result = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total ?? 0;
}

export async function getExpensesByCategory(month: number, year: number) {
  await dbConnect();
  const userId = await getCurrentUserId();
  const { start, end } = getMonthDateRange(month, year);
  const result = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
  ]);
  return result.map((r: { _id: string; total: number }) => ({
    category: r._id,
    amount: r.total,
  }));
}
