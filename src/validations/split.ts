import { z } from "zod";

/**
 * A Google Pay–style split.
 *
 * Two flows, decided by `payer`:
 *  - "me": I paid the whole bill. My share becomes an expense and each other
 *    participant's share becomes a `lent` record (they owe me). Because the
 *    full amount already left my account, each lent share is also logged as an
 *    expense so my balance / safe-to-spend drops by the whole bill now;
 *    collecting repayments later adds the income back.
 *  - "other": someone else paid. Only my share is recorded, as a `borrowed`
 *    record (I owe them) — nothing else, and no money has left my account yet.
 */
// Rows are intentionally permissive here — their contents are only required
// when `payer === "me"`, so per-row rules live in `superRefine` below. This
// keeps a leftover empty row from blocking submit in the "someone else paid"
// flow, where participants are ignored entirely.
export const splitParticipantSchema = z.object({
  personName: z.string().optional(),
  // The form registers this with `valueAsNumber`, which yields NaN for an empty
  // number input. zod 4's `z.number()` rejects NaN, which would fail the base
  // parse before `superRefine` runs — and in the "someone else paid" flow these
  // inputs aren't even rendered, so that error would have nowhere to show and
  // the form would silently refuse to submit. Coerce NaN to undefined ("not
  // entered"); the per-row positivity check in `superRefine` still applies where
  // participants actually matter (payer === "me", itemized).
  amount: z.preprocess(
    (v) => (typeof v === "number" && Number.isNaN(v) ? undefined : v),
    z.number().optional()
  ),
});

export const splitSchema = z
  .object({
    description: z
      .string({ message: "Description is required" })
      .min(1, "Description is required"),
    payer: z.enum(["me", "other"], { message: "Select who paid" }),
    // The form's register coerces an empty input to 0, so an empty share is
    // valid when you paid entirely for others (the "other" flow separately
    // requires it to be > 0 in superRefine).
    myShare: z
      .number({ message: "Your share is required" })
      .nonnegative("Your share can't be negative"),
    category: z.string().optional(),
    date: z.string({ message: "Date is required" }),
    dueDate: z.string().optional(),
    // payer === "me": how the "others owe me" side is captured.
    //  - "itemized": name each person and their share (`participants`).
    //  - "group":    don't name anyone; record one lump `othersOwe` amount
    //                against a single label, to be settled manually later.
    splitMode: z.enum(["itemized", "group"]).optional(),
    // payer === "me": the people who owe me their share (itemized mode).
    participants: z.array(splitParticipantSchema).optional(),
    // payer === "me" + group mode: the total everyone else owes me, tracked
    // as one record the user marks settled once they've all paid.
    othersOwe: z.number().optional(),
    groupLabel: z.string().optional(),
    // payer === "other": the person who paid the bill (I owe them my share).
    paidBy: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payer === "me") {
      const groupMode = data.splitMode === "group";
      if (groupMode) {
        if (
          typeof data.othersOwe !== "number" ||
          Number.isNaN(data.othersOwe) ||
          data.othersOwe <= 0
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Enter the total others owe you",
            path: ["othersOwe"],
          });
        }
        return;
      }
      const participants = data.participants ?? [];
      if (participants.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least one person who owes you",
          path: ["participants"],
        });
      }
      participants.forEach((p, index) => {
        if (!p.personName || p.personName.trim().length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "Name is required",
            path: ["participants", index, "personName"],
          });
        }
        if (typeof p.amount !== "number" || Number.isNaN(p.amount) || p.amount <= 0) {
          ctx.addIssue({
            code: "custom",
            message: "Amount must be positive",
            path: ["participants", index, "amount"],
          });
        }
      });
      const total =
        data.myShare +
        participants.reduce((sum, p) => sum + (p.amount ?? 0), 0);
      if (total <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "The split total must be greater than zero",
          path: ["myShare"],
        });
      }
    } else {
      if (!data.paidBy || data.paidBy.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Enter who paid the bill",
          path: ["paidBy"],
        });
      }
      if (data.myShare <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Your share must be greater than zero",
          path: ["myShare"],
        });
      }
    }
  });

export type SplitFormData = z.infer<typeof splitSchema>;
