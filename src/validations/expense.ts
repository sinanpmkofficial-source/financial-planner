import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/constants";

export const expenseSchema = z.object({
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  note: z.string().optional(),
  date: z.string({ message: "Date is required" }),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
