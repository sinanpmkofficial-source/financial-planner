import { z } from "zod";

export const borrowLendSchema = z.object({
  personName: z
    .string({ message: "Person name is required" })
    .min(1, "Person name is required"),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive"),
  type: z.enum(["borrowed", "lent"], {
    message: "Type is required",
  }),
  date: z.string({ message: "Date is required" }),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type BorrowLendFormData = z.infer<typeof borrowLendSchema>;
