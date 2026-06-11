import mongoose, { Schema, type Document } from "mongoose";

export interface IBudget extends Document {
  category: string;
  amount: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    category: {
      type: String,
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

BudgetSchema.index({ month: 1, year: 1 });
BudgetSchema.index({ category: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Budget || mongoose.model<IBudget>("Budget", BudgetSchema);
