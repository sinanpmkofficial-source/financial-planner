"use server";

import { dbConnect } from "@/lib/db";
import BorrowLend from "@/models/borrow-lend";
import Expense from "@/models/expense";
import Income from "@/models/income";
import {
  borrowLendSchema,
  type BorrowLendFormData,
} from "@/validations/borrow-lend";
import { serializeDoc } from "@/lib/format";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { BorrowLend as BorrowLendType } from "@/types";

export async function getBorrowLendRecords(): Promise<BorrowLendType[]> {
  await dbConnect();
  const userId = await getCurrentUserId();
  const docs = await BorrowLend.find({ userId }).sort({ date: -1 }).lean();
  return serializeDoc<BorrowLendType[]>(docs);
}

export async function getPendingBorrowLend(): Promise<BorrowLendType[]> {
  await dbConnect();
  const userId = await getCurrentUserId();
  const docs = await BorrowLend.find({ userId, status: "pending" })
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
    const userId = await getCurrentUserId();
    const { createTransaction, ...record } = parsed;
    const date = new Date(parsed.date);
    await BorrowLend.create({
      ...record,
      userId,
      date,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    });

    if (createTransaction) {
      // Borrowing brings money in (Income); lending sends money out (Expense).
      if (parsed.type === "borrowed") {
        await Income.create({
          userId,
          amount: parsed.amount,
          source: `Borrowed from ${parsed.personName}`,
          note: parsed.notes || "Borrowed money",
          date,
        });
      } else {
        await Expense.create({
          userId,
          amount: parsed.amount,
          category: "Debt",
          note: parsed.notes || `Lent money to ${parsed.personName}`,
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
    const userId = await getCurrentUserId();
    const { createTransaction: _createTransaction, ...record } = parsed;
    const updated = await BorrowLend.findOneAndUpdate(
      { _id: id, userId },
      {
        ...record,
        date: new Date(parsed.date),
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      }
    );
    if (!updated) {
      return { success: false, error: "Record not found" };
    }
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
    const userId = await getCurrentUserId();
    const deleted = await BorrowLend.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return { success: false, error: "Record not found" };
    }
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
    const userId = await getCurrentUserId();
    const record = await BorrowLend.findOne({ _id: id, userId });
    if (record) {
      const remaining = record.amount - (record.paidAmount ?? 0);
      await BorrowLend.findOneAndUpdate(
        { _id: id, userId },
        {
          paidAmount: record.amount,
          status: "settled",
        }
      );
      // By default when clicking settle directly, we can record the full remaining repayment as transaction
      if (record.type === "borrowed") {
        await Expense.create({
          userId,
          amount: remaining,
          category: "Debt",
          note: `Repayment of borrowed money to ${record.personName} (Full Settlement)`,
          date: new Date(),
        });
      } else {
        await Income.create({
          userId,
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
    const userId = await getCurrentUserId();
    const record = await BorrowLend.findOne({ _id: id, userId });
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

    await BorrowLend.findOneAndUpdate(
      { _id: id, userId },
      {
        paidAmount: newPaidAmount,
        status,
      }
    );

    if (createTransaction) {
      if (record.type === "borrowed") {
        await Expense.create({
          userId,
          amount: repaymentAmount,
          category: "Debt",
          note: `Repayment of borrowed money to ${record.personName}`,
          date,
        });
      } else {
        await Income.create({
          userId,
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
  const userId = await getCurrentUserId();
  const records = await BorrowLend.find({ userId }).lean();

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

  return { totalBorrowed, totalLent, pendingCollections, pendingPayments };
}
