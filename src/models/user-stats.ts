import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IUserStats extends Document {
  userId: Types.ObjectId;
  totalXp: number;
  level: number;
  lastExpenseDate?: Date;
  updatedAt: Date;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    totalXp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastExpenseDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.UserStats ||
  mongoose.model<IUserStats>("UserStats", UserStatsSchema);
