import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IGoalContribution extends Document {
  goalId: Types.ObjectId;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GoalContributionSchema = new Schema<IGoalContribution>(
  {
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// Index for efficient querying by date and goal
GoalContributionSchema.index({ date: -1 });
GoalContributionSchema.index({ goalId: 1, date: -1 });

export default mongoose.models.GoalContribution ||
  mongoose.model<IGoalContribution>("GoalContribution", GoalContributionSchema);
