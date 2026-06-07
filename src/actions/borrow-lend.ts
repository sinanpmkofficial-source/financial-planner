"use server";

import { dbConnect } from "@/lib/db";
import BorrowLend from "@/models/borrow-lend";
import {
  borrowLendSchema,
  type BorrowLendFormData,
} from "@/validations/borrow-lend";
import { serializeDoc } from "@/lib/format";
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
    await BorrowLend.findByIdAndUpdate(id, { status: "settled" });
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

export async function getBorrowLendSummary() {
  await dbConnect();
  const records = await BorrowLend.find({ status: "pending" }).lean();

  let totalBorrowed = 0;
  let totalLent = 0;
  let pendingCollections = 0;
  let pendingPayments = 0;

  for (const r of records) {
    if (r.type === "borrowed") {
      totalBorrowed += r.amount;
      pendingPayments += r.amount;
    } else {
      totalLent += r.amount;
      pendingCollections += r.amount;
    }
  }

  return { totalBorrowed, totalLent, pendingCollections, pendingPayments };
}
