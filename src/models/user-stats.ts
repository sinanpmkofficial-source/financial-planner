import mongoose, { Schema, type Document } from "mongoose";

export interface IUserStats extends Document {
  totalXp: number;
  level: number;
  lastExpenseDate?: Date;
  updatedAt: Date;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    totalXp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastExpenseDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.UserStats ||
  mongoose.model<IUserStats>("UserStats", UserStatsSchema);
