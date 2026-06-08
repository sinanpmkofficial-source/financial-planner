import { z } from "zod";

export const transactionSchema = z
  .object({
    type: z.enum(["expense", "income"]),
    amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be positive"),
    category: z.string().optional(),
    tag: z.enum(["Needs", "Wants", "Investments", "Unnecessary Spending"]).optional(),
    source: z.string().optional(),
    note: z.string().optional(),
    date: z.string({ message: "Date is required" }),
    // Recurrence fields (optional)
    isRecurring: z.boolean().optional(),
    frequency: z.enum(["weekly", "monthly", "yearly"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "expense") {
      if (!data.category || data.category.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Category is required for expenses",
          path: ["category"],
        });
      }
      if (!data.tag) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Financial tag is required for expenses",
          path: ["tag"],
        });
      }
    } else if (data.type === "income") {
      if (!data.source || data.source.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source is required for income",
          path: ["source"],
        });
      }
    }
  });

export type TransactionFormData = z.infer<typeof transactionSchema>;
