"use server";

import { dbConnect } from "@/lib/db";
import BorrowLend from "@/models/borrow-lend";
import Expense from "@/models/expense";
import { splitSchema, type SplitFormData } from "@/validations/split";
import { upsertContact } from "@/actions/contact";
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

    // A share someone owes me: a `lent` record plus a mirrored expense, since
    // the full bill already left my account. Collecting the repayment later
    // records income that adds it back.
    const recordLentShare = async (personName: string, amount: number) => {
      await BorrowLend.create({
        userId,
        personName,
        amount,
        paidAmount: 0,
        type: "lent",
        date,
        dueDate,
        status: "pending",
        notes: `Split: ${parsed.description}`,
      });
      await Expense.create({
        userId,
        amount,
        category: "Debt",
        tag: "Needs",
        note: `Lent for split "${parsed.description}" to ${personName}`,
        date,
      });
      await upsertContact(personName);
    };

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

      // Group mode: the user didn't name anyone — record one lump `lent`
      // record they'll mark settled once everyone has paid them back. The full
      // bill already left the account, so mirror it as an expense now too.
      if (parsed.splitMode === "group") {
        const label = (parsed.groupLabel ?? "").trim() || "Others";
        const owed = parsed.othersOwe ?? 0;
        if (owed > 0) {
          await recordLentShare(label, owed);
        }
        revalidatePath("/");
        revalidatePath("/borrow-lend");
        return { success: true };
      }

      // Each other participant owes me their share.
      for (const p of parsed.participants ?? []) {
        const personName = p.personName?.trim();
        // superRefine guarantees these, but guard defensively for the types.
        if (!personName || typeof p.amount !== "number" || p.amount <= 0) {
          continue;
        }
        await recordLentShare(personName, p.amount);
      }
    } else {
      // Someone else paid — I only owe my share. Record it as borrowed and
      // nothing else; no money has left my account yet. Paying them back later
      // (part by part) records the expense.
      const paidBy = (parsed.paidBy ?? "").trim();
      await BorrowLend.create({
        userId,
        personName: paidBy,
        amount: parsed.myShare,
        paidAmount: 0,
        type: "borrowed",
        date,
        dueDate,
        status: "pending",
        notes: `Split: ${parsed.description}`,
      });
      await upsertContact(paidBy);
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
