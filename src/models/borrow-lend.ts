import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IBorrowLend extends Document {
  userId: Types.ObjectId;
  personName: string;
  amount: number;
  paidAmount: number;
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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    personName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
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

BorrowLendSchema.index({ userId: 1, status: 1, type: 1 });

if (mongoose.models.BorrowLend) {
  mongoose.deleteModel("BorrowLend");
}

export default mongoose.model<IBorrowLend>("BorrowLend", BorrowLendSchema);
