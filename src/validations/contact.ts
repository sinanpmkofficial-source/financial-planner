import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(60, "Name is too long"),
  phone: z.string().trim().max(30, "Phone is too long").optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
