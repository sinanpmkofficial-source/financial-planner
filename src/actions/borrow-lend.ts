"use server";

import { dbConnect } from "@/lib/db";
import BorrowLend from "@/models/borrow-lend";
import Expense from "@/models/expense";
import Income from "@/models/income";
import {
  borrowLendSchema,
  type BorrowLendFormData,
} from "@/validations/borrow-lend";
import { serializeDoc, getMonthDateRange } from "@/lib/format";
import { revalidatePath } from "next/cache";
import type { BorrowLend as BorrowLendType } from "@/types";

export async function getBorrowLendRecords(): Promise<BorrowLendType[]> {
  await dbConnect();
  const docs = await BorrowLend.find().sort({ date: -1 }).lean();
  return serializeDoc<BorrowLendType[]>(docs);
}

export async function getPendingBorrowLend(): Promise<BorrowLendType[]> {
  await dbConnect();
  const docs = await BorrowLend.find({ status: "pending" })
    .sort({ dueDate: 1 })
    .lean();
  return serializeDoc<BorrowLendType[]>(docs);
}

export async function createBorrowLend(
  data: BorrowLendFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = borrowLendSchema.parse(data);
    await dbConnect();
    await BorrowLend.create({
      ...parsed,
      date: new Date(parsed.date),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    });

    // Create corresponding transaction to affect balance
    if (parsed.type === "borrowed") {
      await Income.create({
        amount: parsed.amount,
        source: `Borrowed from ${parsed.personName}`,
        note: parsed.notes || `Initial debt recording`,
        date: new Date(parsed.date),
      });
    } else {
      await Expense.create({
        amount: parsed.amount,
        category: "Debt",
        note: `Lent to ${parsed.personName}`,
        date: new Date(parsed.date),
      });
    }

    revalidatePath("/");
    revalidatePath("/borrow-lend");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create record",
    };
  }
}

export async function updateBorrowLend(
  id: string,
  data: BorrowLendFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = borrowLendSchema.parse(data);
    await dbConnect();
    await BorrowLend.findByIdAndUpdate(id, {
      ...parsed,
      date: new Date(parsed.date),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    });
    revalidatePath("/");
    revalidatePath("/borrow-lend");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update record",
    };
  }
}

export async function deleteBorrowLend(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    await BorrowLend.findByIdAndDelete(id);
    revalidatePath("/");
    revalidatePath("/borrow-lend");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete record",
    };
  }
}

export async function settleBorrowLend(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const record = await BorrowLend.findById(id);
    if (record) {
      const remaining = record.amount - (record.paidAmount ?? 0);
      await BorrowLend.findByIdAndUpdate(id, {
        paidAmount: record.amount,
        status: "settled",
      });
      // By default when clicking settle directly, we can record the full remaining repayment as transaction
      if (record.type === "borrowed") {
        await Expense.create({
          amount: remaining,
          category: "Debt",
          note: `Repayment of borrowed money to ${record.personName} (Full Settlement)`,
          date: new Date(),
        });
      } else {
        await Income.create({
          amount: remaining,
          source: `Repayment from ${record.personName}`,
          note: `Collection of lent money (Full Settlement)`,
          date: new Date(),
        });
      }
    }
    revalidatePath("/");
    revalidatePath("/borrow-lend");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to settle record",
    };
  }
}

export async function recordRepayment(
  id: string,
  repaymentAmount: number,
  dateStr: string,
  createTransaction: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const record = await BorrowLend.findById(id);
    if (!record) {
      return { success: false, error: "Record not found" };
    }

    const currentPaid = record.paidAmount ?? 0;
    const newPaidAmount = currentPaid + repaymentAmount;

    if (newPaidAmount > record.amount) {
      return {
        success: false,
        error: `Repayment amount exceeds remaining balance of ${record.amount - currentPaid}`,
      };
    }

    const date = new Date(dateStr);
    const status = newPaidAmount >= record.amount ? "settled" : "pending";

    await BorrowLend.findByIdAndUpdate(id, {
      paidAmount: newPaidAmount,
      status,
    });

    if (createTransaction) {
      if (record.type === "borrowed") {
        await Expense.create({
          amount: repaymentAmount,
          category: "Debt",
          note: `Repayment of borrowed money to ${record.personName}`,
          date,
        });
      } else {
        await Income.create({
          amount: repaymentAmount,
          source: `Repayment from ${record.personName}`,
          note: `Collection of lent money`,
          date,
        });
      }
    }

    revalidatePath("/");
    revalidatePath("/borrow-lend");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record repayment",
    };
  }
}

export async function getBorrowLendSummary() {
  await dbConnect();
  
  const now = new Date();
  const { start: monthStart, end: monthEnd } = getMonthDateRange(now.getMonth() + 1, now.getFullYear());

  const [records, monthIncomeAgg, monthRepaymentsAgg] = await Promise.all([
    BorrowLend.find().lean(),
    Income.aggregate([
      { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { 
        $match: { 
          date: { $gte: monthStart, $lte: monthEnd },
          category: "Debt",
          note: { $regex: /Repayment/i }
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  let totalBorrowed = 0;
  let totalLent = 0;
  let pendingCollections = 0;
  let pendingPayments = 0;

  for (const r of records) {
    const paid = r.paidAmount ?? 0;
    const remaining = r.amount - paid;
    if (r.type === "borrowed") {
      totalBorrowed += r.amount;
      if (r.status === "pending") {
        pendingPayments += remaining;
      }
    } else {
      totalLent += r.amount;
      if (r.status === "pending") {
        pendingCollections += remaining;
      }
    }
  }

  const monthlyIncome = monthIncomeAgg[0]?.total ?? 0;
  const monthlyRepayments = monthRepaymentsAgg[0]?.total ?? 0;
  const repaymentPercentage = monthlyIncome > 0 ? (monthlyRepayments / monthlyIncome) * 100 : 0;

  // Calculate total paid back vs total borrowed across all time
  let totalBorrowedAllTime = 0;
  let totalPaidBackAllTime = 0;
  for (const r of records) {
    if (r.type === "borrowed") {
      totalBorrowedAllTime += r.amount;
      totalPaidBackAllTime += (r.paidAmount ?? 0);
    }
  }
  const globalRepaymentProgress = totalBorrowedAllTime > 0 ? (totalPaidBackAllTime / totalBorrowedAllTime) * 100 : 0;

  return { 
    totalBorrowed, 
    totalLent, 
    pendingCollections, 
    pendingPayments,
    monthlyIncome,
    monthlyRepayments,
    repaymentPercentage,
    totalBorrowedAllTime,
    totalPaidBackAllTime,
    globalRepaymentProgress
  };
}
