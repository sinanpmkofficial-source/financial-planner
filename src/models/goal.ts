import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IGoal extends Document {
  userId: Types.ObjectId;
  name: string;
  targetAmount: number;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true, min: 0 },
    icon: { type: String, default: "Target" },
    color: { type: String, default: "hsl(217, 91%, 60%)" },
  },
  { timestamps: true }
);

export default mongoose.models.Goal ||
  mongoose.model<IGoal>("Goal", GoalSchema);
