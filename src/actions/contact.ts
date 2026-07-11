"use server";

import { dbConnect } from "@/lib/db";
import Contact from "@/models/contact";
import BorrowLend from "@/models/borrow-lend";
import { contactSchema, type ContactFormData } from "@/validations/contact";
import { serializeDoc } from "@/lib/format";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { Contact as ContactType } from "@/types";

export async function getContacts(): Promise<ContactType[]> {
  await dbConnect();
  const userId = await getCurrentUserId();
  const docs = await Contact.find({ userId })
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .lean();
  return serializeDoc<ContactType[]>(docs);
}

/**
 * Find-or-create a contact by its normalized name and bump its usage.
 * Called both from the UI and from the borrow/lend action so the contact
 * list grows automatically from what the user already types. No-ops on a
 * blank name. Never throws — a contact bookkeeping failure must not break
 * the mutation it piggybacks on.
 */
export async function upsertContact(
  name: string,
  phone?: string
): Promise<void> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return;
  const nameLower = trimmed.toLowerCase();
  try {
    await dbConnect();
    const userId = await getCurrentUserId();
    await Contact.findOneAndUpdate(
      { userId, nameLower },
      {
        $set: { name: trimmed, ...(phone ? { phone: phone.trim() } : {}), lastUsedAt: new Date() },
        $inc: { usageCount: 1 },
        $setOnInsert: { userId, nameLower },
      },
      { upsert: true }
    );
    revalidatePath("/borrow-lend");
  } catch {
    // swallow — see docblock
  }
}

/**
 * Deliberately create (or fetch, if it already exists) a contact — used by
 * the contacts page and the inline "add new" in the @-mention picker. Idempotent
 * on the normalized name so it never produces a duplicate.
 */
export async function createContact(
  data: ContactFormData
): Promise<{ success: boolean; contact?: ContactType; error?: string }> {
  try {
    const parsed = contactSchema.parse(data);
    await dbConnect();
    const userId = await getCurrentUserId();
    const nameLower = parsed.name.toLowerCase();
    const doc = await Contact.findOneAndUpdate(
      { userId, nameLower },
      {
        $set: {
          name: parsed.name,
          ...(parsed.phone ? { phone: parsed.phone } : {}),
        },
        $setOnInsert: { userId, nameLower, usageCount: 0, lastUsedAt: new Date() },
      },
      { upsert: true, new: true }
    ).lean();
    revalidatePath("/contacts");
    revalidatePath("/borrow-lend");
    return { success: true, contact: serializeDoc<ContactType>(doc) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

export async function updateContact(
  id: string,
  data: ContactFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = contactSchema.parse(data);
    await dbConnect();
    const userId = await getCurrentUserId();
    const updated = await Contact.findOneAndUpdate(
      { _id: id, userId },
      {
        name: parsed.name,
        nameLower: parsed.name.toLowerCase(),
        phone: parsed.phone,
      }
    );
    if (!updated) {
      return { success: false, error: "Contact not found" };
    }
    revalidatePath("/borrow-lend");
    revalidatePath("/contacts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update contact",
    };
  }
}

export async function deleteContact(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const userId = await getCurrentUserId();
    const deleted = await Contact.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return { success: false, error: "Contact not found" };
    }
    revalidatePath("/borrow-lend");
    revalidatePath("/contacts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete contact",
    };
  }
}

/**
 * One-time seed: turn every distinct person from existing borrow/lend
 * history into a contact so the suggestion list is useful immediately.
 */
export async function backfillContactsFromRecords(): Promise<{
  success: boolean;
  added: number;
  error?: string;
}> {
  try {
    await dbConnect();
    const userId = await getCurrentUserId();
    const names: string[] = await BorrowLend.distinct("personName", { userId });
    let added = 0;
    for (const name of names) {
      const trimmed = (name ?? "").trim();
      if (!trimmed) continue;
      const nameLower = trimmed.toLowerCase();
      const res = await Contact.updateOne(
        { userId, nameLower },
        {
          $setOnInsert: {
            userId,
            nameLower,
            name: trimmed,
            usageCount: 1,
            lastUsedAt: new Date(),
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount) added += 1;
    }
    revalidatePath("/contacts");
    revalidatePath("/borrow-lend");
    return { success: true, added };
  } catch (error) {
    return {
      success: false,
      added: 0,
      error:
        error instanceof Error ? error.message : "Failed to backfill contacts",
    };
  }
}
