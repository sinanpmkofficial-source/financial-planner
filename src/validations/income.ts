import { z } from "zod";

export const incomeSchema = z.object({
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive"),
  source: z
    .string({ message: "Source is required" })
    .min(1, "Source is required"),
  note: z.string().optional(),
  date: z.string({ message: "Date is required" }),
});

export type IncomeFormData = z.infer<typeof incomeSchema>;
