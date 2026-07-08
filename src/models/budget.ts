import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IBudget extends Document {
  userId: Types.ObjectId;
  category: string;
  amount: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
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

BudgetSchema.index({ userId: 1, month: 1, year: 1 });
BudgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });

if (mongoose.models.Budget) {
  mongoose.deleteModel("Budget");
}

export default mongoose.model<IBudget>("Budget", BudgetSchema);
