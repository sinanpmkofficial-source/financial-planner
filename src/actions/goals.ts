"use server";

import { dbConnect } from "@/lib/db";
import Goal from "@/models/goal";
import GoalContribution from "@/models/goal-contribution";
import { revalidatePath } from "next/cache";

export async function getGoalsWithProgress() {
  await dbConnect();
  const goals = await Goal.find().sort({ createdAt: -1 }).lean();

  const results = await Promise.all(
    goals.map(async (goal: any) => {
      const contributions = await GoalContribution.find({ goalId: goal._id }).lean();
      const totalContributed = contributions.reduce((sum: number, c: any) => sum + c.amount, 0);
      
      return {
        _id: goal._id.toString(),
        name: goal.name,
        targetAmount: goal.targetAmount,
        icon: goal.icon,
        color: goal.color,
        createdAt: goal.createdAt.toISOString(),
        totalContributed,
        progressPercentage: goal.targetAmount > 0 
          ? Math.min(100, (totalContributed / goal.targetAmount) * 100)
          : 0
      };
    })
  );

  return results;
}

export async function createGoal(data: { name: string; targetAmount: number; icon?: string; color?: string }) {
  await dbConnect();
  try {
    await Goal.create({
      name: data.name,
      targetAmount: data.targetAmount,
      icon: data.icon || "🎯",
      color: data.color || "hsl(217, 91%, 60%)",
    });
    revalidatePath("/financial-health");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addGoalContribution(goalId: string, amount: number, date: string) {
  await dbConnect();
  try {
    await GoalContribution.create({
      goalId,
      amount,
      date: new Date(date),
    });
    revalidatePath("/financial-health");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteGoal(goalId: string) {
  await dbConnect();
  try {
    await GoalContribution.deleteMany({ goalId });
    await Goal.findByIdAndDelete(goalId);
    revalidatePath("/financial-health");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
