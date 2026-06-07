import mongoose, { Schema, type Document } from "mongoose";

export interface IIncome extends Document {
  amount: number;
  source: string;
  note?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new Schema<IIncome>(
  {
    amount: { type: Number, required: true, min: 0 },
    source: { type: String, required: true },
    note: { type: String, default: "" },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

IncomeSchema.index({ date: -1 });

export default mongoose.models.Income ||
  mongoose.model<IIncome>("Income", IncomeSchema);
