import mongoose, { Schema, type Document } from "mongoose";

export interface IRecurringExpense extends Document {
  amount: number;
  category: string;
  tag: "Needs" | "Wants" | "Investments" | "Unnecessary Spending";
  note?: string;
  frequency: "weekly" | "monthly" | "yearly";
  nextDueDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringExpenseSchema = new Schema<IRecurringExpense>(
  {
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    tag: {
      type: String,
      required: true,
      enum: ["Needs", "Wants", "Investments", "Unnecessary Spending"],
      default: "Needs",
    },
    note: { type: String, default: "" },
    frequency: {
      type: String,
      required: true,
      enum: ["weekly", "monthly", "yearly"],
      default: "monthly",
    },
    nextDueDate: { type: Date, required: true, default: Date.now },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

RecurringExpenseSchema.index({ nextDueDate: 1, isActive: 1 });

if (mongoose.models.RecurringExpense) {
  mongoose.deleteModel("RecurringExpense");
}

export default mongoose.model<IRecurringExpense>(
  "RecurringExpense",
  RecurringExpenseSchema
);
