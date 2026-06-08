import { z } from "zod";

export const transactionSchema = z
  .object({
    type: z.enum(["expense", "income"]),
    amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be positive"),
    category: z.string().optional(),
    source: z.string().optional(),
    note: z.string().optional(),
    date: z.string({ message: "Date is required" }),
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
