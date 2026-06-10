import { z } from "zod";

export const expenseSchema = z.object({
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  tag: z.enum(["Needs", "Wants", "Investments", "Unnecessary Spending"]),
  note: z.string().optional(),
  date: z.string({ message: "Date is required" }),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
