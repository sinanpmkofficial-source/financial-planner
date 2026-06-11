"use server";

import { dbConnect } from "@/lib/db";
import Income from "@/models/income";
import { incomeSchema, type IncomeFormData } from "@/validations/income";
import { getMonthDateRange, serializeDoc } from "@/lib/format";
import { awardXp } from "@/actions/stats";
import { XP_REWARDS } from "@/constants";
import { revalidatePath } from "next/cache";
import type { Income as IncomeType } from "@/types";

export async function getIncomes(
  month: number,
  year: number
): Promise<IncomeType[]> {
  await dbConnect();
  const { start, end } = getMonthDateRange(month, year);
  const docs = await Income.find({ date: { $gte: start, $lte: end } })
    .sort({ date: -1 })
    .lean();
  return serializeDoc<IncomeType[]>(docs);
}

export async function getIncomesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<IncomeType[]> {
  await dbConnect();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const docs = await Income.find({
    date: { $gte: start, $lte: end },
  })
    .sort({ date: -1 })
    .lean();
  return serializeDoc<IncomeType[]>(docs);
}

export async function getRecentIncomes(limit = 5): Promise<IncomeType[]> {
  await dbConnect();
  const docs = await Income.find().sort({ date: -1 }).limit(limit).lean();
  return serializeDoc<IncomeType[]>(docs);
}

export async function createIncome(
  data: IncomeFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = incomeSchema.parse(data);
    await dbConnect();
    await Income.create({ ...parsed, date: new Date(parsed.date) });
    await awardXp(XP_REWARDS.LOG_INCOME);
    revalidatePath("/");
    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create income",
    };
  }
}

export async function updateIncome(
  id: string,
  data: IncomeFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = incomeSchema.parse(data);
    await dbConnect();
    await Income.findByIdAndUpdate(id, {
      ...parsed,
      date: new Date(parsed.date),
    });
    revalidatePath("/");
    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update income",
    };
  }
}

export async function deleteIncome(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    await Income.findByIdAndDelete(id);
    revalidatePath("/");
    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete income",
    };
  }
}

export async function getIncomeTotals(month: number, year: number) {
  await dbConnect();
  const { start, end } = getMonthDateRange(month, year);
  const result = await Income.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total ?? 0;
}
