"use server";

import { dbConnect } from "@/lib/db";
import RecurringExpense from "@/models/recurring-expense";
import Expense from "@/models/expense";
import { awardXp } from "@/actions/stats";
import { getCurrentUserId } from "@/lib/session";
import { XP_REWARDS } from "@/constants";
import { revalidatePath } from "next/cache";
import { addDays, addMonths, addYears } from "date-fns";

export async function getRecurringExpenses() {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    const list = await RecurringExpense.find({ userId }).sort({ nextDueDate: 1 }).lean();
    return JSON.parse(JSON.stringify(list));
  } catch {
    return [];
  }
}

export async function createRecurringExpense(data: {
  amount: number;
  category: string;
  tag: "Needs" | "Wants" | "Investments" | "Unnecessary Spending";
  note?: string;
  frequency: "weekly" | "monthly" | "yearly";
  nextDueDate: string;
}) {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    const newRecord = await RecurringExpense.create({
      userId,
      amount: data.amount,
      category: data.category,
      tag: data.tag,
      note: data.note || "",
      frequency: data.frequency,
      nextDueDate: new Date(data.nextDueDate),
      isActive: true,
    });
    revalidatePath("/");
    revalidatePath("/transactions");
    return { success: true, id: newRecord._id.toString() };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create recurring expense" 
    };
  }
}

export async function confirmRecurringPayment(id: string) {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    const template = await RecurringExpense.findOne({ _id: id, userId });
    if (!template || !template.isActive) {
      return { success: false, error: "Reminder not found or inactive" };
    }

    // 1. Log the actual Expense for today
    await Expense.create({
      userId,
      amount: template.amount,
      category: template.category,
      tag: template.tag,
      note: `${template.note || ""} (Recurring Payment)`.trim(),
      date: new Date(), // Confirmed today
      recurringExpenseId: template._id,
    });

    // 2. Advance nextDueDate
    let nextDate = new Date(template.nextDueDate);
    const today = new Date();
    // If nextDueDate is in the past or today, we advance it.
    // We keep advancing until nextDate is strictly in the future.
    while (nextDate <= today) {
      if (template.frequency === "weekly") {
        nextDate = addDays(nextDate, 7);
      } else if (template.frequency === "monthly") {
        nextDate = addMonths(nextDate, 1);
      } else if (template.frequency === "yearly") {
        nextDate = addYears(nextDate, 1);
      }
    }

    template.nextDueDate = nextDate;
    await template.save();

    // 3. Award XP
    await awardXp(XP_REWARDS.LOG_EXPENSE);

    revalidatePath("/");
    revalidatePath("/transactions");
    
    return { success: true };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to confirm payment" 
    };
  }
}

export async function deleteRecurringExpense(id: string) {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    const deleted = await RecurringExpense.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return { success: false, error: "Recurring expense not found" };
    }
    revalidatePath("/");
    revalidatePath("/transactions");
    return { success: true };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete recurring expense" 
    };
  }
}

export async function updateRecurringExpense(
  id: string,
  data: {
    amount: number;
    category: string;
    tag: "Needs" | "Wants" | "Investments" | "Unnecessary Spending";
    note?: string;
    frequency: "weekly" | "monthly" | "yearly";
  }
) {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    const updated = await RecurringExpense.findOneAndUpdate(
      { _id: id, userId },
      {
        amount: data.amount,
        category: data.category,
        tag: data.tag,
        note: data.note || "",
        frequency: data.frequency,
      }
    );
    if (!updated) {
      return { success: false, error: "Recurring expense not found" };
    }
    revalidatePath("/");
    revalidatePath("/transactions");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update recurring expense",
    };
  }
}

