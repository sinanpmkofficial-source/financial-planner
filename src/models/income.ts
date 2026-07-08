import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IIncome extends Document {
  userId: Types.ObjectId;
  amount: number;
  source: string;
  note?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new Schema<IIncome>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    source: { type: String, required: true },
    note: { type: String, default: "" },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

IncomeSchema.index({ userId: 1, date: -1 });

if (mongoose.models.Income) {
  mongoose.deleteModel("Income");
}

export default mongoose.model<IIncome>("Income", IncomeSchema);
