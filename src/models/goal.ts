import mongoose, { Schema, type Document } from "mongoose";

export interface IGoal extends Document {
  name: string;
  targetAmount: number;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true, min: 0 },
    icon: { type: String, default: "🎯" },
    color: { type: String, default: "hsl(217, 91%, 60%)" },
  },
  { timestamps: true }
);

export default mongoose.models.Goal ||
  mongoose.model<IGoal>("Goal", GoalSchema);
