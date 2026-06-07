import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/constants";

export const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

export type BudgetFormData = z.infer<typeof budgetSchema>;
