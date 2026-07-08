"use server";

import { dbConnect } from "@/lib/db";
import Goal, { type IGoal } from "@/models/goal";
import GoalContribution from "@/models/goal-contribution";
import { revalidatePath } from "next/cache";

interface GoalProgressResult {
  _id: string;
  name: string;
  targetAmount: number;
  icon: string;
  color: string;
  createdAt: string;
  totalContributed: number;
  progressPercentage: number;
}

export async function getGoalsWithProgress(): Promise<GoalProgressResult[]> {
  await dbConnect();
  const goals = await Goal.find().sort({ createdAt: -1 }).lean() as unknown as IGoal[];

  const results = await Promise.all(
    goals.map(async (goal) => {
      const contributions = await GoalContribution.find({ goalId: goal._id }).lean() as unknown as { amount: number }[];
      const totalContributed = contributions.reduce((sum: number, c) => sum + c.amount, 0);
      
      return {
        _id: (goal._id as { toString(): string }).toString(),
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
    revalidatePath("/goals");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create goal"
    };
  }
}

export async function updateGoal(
  goalId: string,
  data: { name: string; targetAmount: number; icon?: string; color?: string }
) {
  await dbConnect();
  try {
    await Goal.findByIdAndUpdate(goalId, {
      name: data.name,
      targetAmount: data.targetAmount,
      ...(data.icon ? { icon: data.icon } : {}),
      ...(data.color ? { color: data.color } : {}),
    });
    revalidatePath("/goals");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update goal",
    };
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
    revalidatePath("/goals");
    return { success: true };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to add goal contribution" 
    };
  }
}

export async function deleteGoal(goalId: string) {
  await dbConnect();
  try {
    await GoalContribution.deleteMany({ goalId });
    await Goal.findByIdAndDelete(goalId);
    revalidatePath("/goals");
    return { success: true };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete goal" 
    };
  }
}
