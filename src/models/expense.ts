import mongoose, { Schema, type Document } from "mongoose";

export interface IExpense extends Document {
  amount: number;
  category: string;
  tag: "Needs" | "Wants" | "Investments" | "Unnecessary Spending";
  note?: string;
  date: Date;
  recurringExpenseId?: mongoose.Types.ObjectId;
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
    tag: {
      type: String,
      required: true,
      enum: ["Needs", "Wants", "Investments", "Unnecessary Spending"],
      default: "Needs",
    },
    recurringExpenseId: {
      type: Schema.Types.ObjectId,
      ref: "RecurringExpense",
    },
    note: { type: String, default: "" },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ category: 1, date: -1 });
ExpenseSchema.index({ tag: 1, date: -1 });

if (mongoose.models.Expense) {
  mongoose.deleteModel("Expense");
}

export default mongoose.model<IExpense>("Expense", ExpenseSchema);
