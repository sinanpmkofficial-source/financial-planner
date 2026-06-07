import mongoose, { Schema, type Document } from "mongoose";

export interface IBorrowLend extends Document {
  personName: string;
  amount: number;
  type: "borrowed" | "lent";
  date: Date;
  dueDate?: Date;
  status: "pending" | "settled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BorrowLendSchema = new Schema<IBorrowLend>(
  {
    personName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      required: true,
      enum: ["borrowed", "lent"],
    },
    date: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ["pending", "settled"],
      default: "pending",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

BorrowLendSchema.index({ status: 1, type: 1 });

export default mongoose.models.BorrowLend ||
  mongoose.model<IBorrowLend>("BorrowLend", BorrowLendSchema);
