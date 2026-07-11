"use server";

import { dbConnect } from "@/lib/db";
import BorrowLend from "@/models/borrow-lend";
import Expense from "@/models/expense";
import { splitSchema, type SplitFormData } from "@/validations/split";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Record a Google Pay–style split. See `splitSchema` for the two flows.
 *
 * Amounts arrive already converted to integer paise from the form boundary.
 */
export async function createSplit(
  data: SplitFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = splitSchema.parse(data);
    await dbConnect();
    const userId = await getCurrentUserId();

    const date = new Date(parsed.date);
    const dueDate = parsed.dueDate ? new Date(parsed.dueDate) : undefined;

    if (parsed.payer === "me") {
      // My share is a genuine expense.
      if (parsed.myShare > 0) {
        await Expense.create({
          userId,
          amount: parsed.myShare,
          category: parsed.category || "Other",
          tag: "Needs",
          note: `Split: ${parsed.description} (my share)`,
          date,
        });
      }

      // Each other participant owes me their share (a `lent` record). The full
      // bill already left my account, so mirror each share as an expense now;
      // collecting the repayment later records income that adds it back.
      for (const p of parsed.participants ?? []) {
        const personName = p.personName?.trim();
        // superRefine guarantees these, but guard defensively for the types.
        if (!personName || typeof p.amount !== "number" || p.amount <= 0) {
          continue;
        }
        await BorrowLend.create({
          userId,
          personName,
          amount: p.amount,
          paidAmount: 0,
          type: "lent",
          date,
          dueDate,
          status: "pending",
          notes: `Split: ${parsed.description}`,
        });
        await Expense.create({
          userId,
          amount: p.amount,
          category: "Debt",
          tag: "Needs",
          note: `Lent for split "${parsed.description}" to ${personName}`,
          date,
        });
      }
    } else {
      // Someone else paid — I only owe my share. Record it as borrowed and
      // nothing else; no money has left my account yet. Paying them back later
      // (part by part) records the expense.
      await BorrowLend.create({
        userId,
        personName: (parsed.paidBy ?? "").trim(),
        amount: parsed.myShare,
        paidAmount: 0,
        type: "borrowed",
        date,
        dueDate,
        status: "pending",
        notes: `Split: ${parsed.description}`,
      });
    }

    revalidatePath("/");
    revalidatePath("/borrow-lend");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record split",
    };
  }
}
