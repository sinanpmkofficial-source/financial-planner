import mongoose, { Schema, type Document } from "mongoose";
import { EXPENSE_CATEGORIES } from "@/constants";

export interface IExpense extends Document {
  amount: number;
  category: string;
  note?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
    },
    note: { type: String, default: "" },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ category: 1, date: -1 });

if (mongoose.models.Expense) {
  mongoose.deleteModel("Expense");
}

export default mongoose.model<IExpense>("Expense", ExpenseSchema);
