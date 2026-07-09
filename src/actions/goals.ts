"use server";

import { dbConnect } from "@/lib/db";
import Goal, { type IGoal } from "@/models/goal";
import GoalContribution from "@/models/goal-contribution";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";

interface GoalProgressResult {
  _id: string;
  name: string;
  targetAmount: number;
  icon: string;
  color: string;
  targetDate: string | null;
  createdAt: string;
  totalContributed: number;
  progressPercentage: number;
  contributionCount: number;
  lastContributedAt: string | null;
}

export interface GoalContributionResult {
  _id: string;
  amount: number;
  date: string;
}

export async function getGoalsWithProgress(): Promise<GoalProgressResult[]> {
  await dbConnect();
  const userId = await getCurrentUserId();
  const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean() as unknown as IGoal[];

  const results = await Promise.all(
    goals.map(async (goal) => {
      const contributions = await GoalContribution.find({ userId, goalId: goal._id })
        .sort({ date: -1 })
        .lean() as unknown as { amount: number; date: Date }[];
      const totalContributed = contributions.reduce((sum: number, c) => sum + c.amount, 0);
      const lastContributedAt = contributions.length > 0 ? contributions[0].date : null;

      return {
        _id: (goal._id as { toString(): string }).toString(),
        name: goal.name,
        targetAmount: goal.targetAmount,
        icon: goal.icon,
        color: goal.color,
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString() : null,
        createdAt: goal.createdAt.toISOString(),
        totalContributed,
        progressPercentage: goal.targetAmount > 0
          ? Math.min(100, (totalContributed / goal.targetAmount) * 100)
          : 0,
        contributionCount: contributions.length,
        lastContributedAt: lastContributedAt ? new Date(lastContributedAt).toISOString() : null,
      };
    })
  );

  return results;
}

export async function getGoalContributions(
  goalId: string
): Promise<GoalContributionResult[]> {
  await dbConnect();
  const userId = await getCurrentUserId();
  const contributions = (await GoalContribution.find({ userId, goalId })
    .sort({ date: -1, createdAt: -1 })
    .lean()) as unknown as {
    _id: { toString(): string };
    amount: number;
    date: Date;
  }[];

  return contributions.map((c) => ({
    _id: c._id.toString(),
    amount: c.amount,
    date: new Date(c.date).toISOString(),
  }));
}

export async function createGoal(data: { name: string; targetAmount: number; icon?: string; color?: string; targetDate?: string | null }) {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    await Goal.create({
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      icon: data.icon || "Target",
      color: data.color || "hsl(217, 91%, 60%)",
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
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
  data: { name: string; targetAmount: number; icon?: string; color?: string; targetDate?: string | null }
) {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    const updated = await Goal.findOneAndUpdate(
      { _id: goalId, userId },
      {
        name: data.name,
        targetAmount: data.targetAmount,
        ...(data.icon ? { icon: data.icon } : {}),
        ...(data.color ? { color: data.color } : {}),
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      }
    );
    if (!updated) {
      return { success: false, error: "Goal not found" };
    }
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
    const userId = await getCurrentUserId();
    // Ensure the goal belongs to the caller before recording against it.
    const goal = await Goal.findOne({ _id: goalId, userId }).lean();
    if (!goal) {
      return { success: false, error: "Goal not found" };
    }
    await GoalContribution.create({
      userId,
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

export async function deleteGoalContribution(contributionId: string) {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    const deleted = await GoalContribution.findOneAndDelete({ _id: contributionId, userId });
    if (!deleted) {
      return { success: false, error: "Contribution not found" };
    }
    revalidatePath("/goals");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete contribution",
    };
  }
}

export async function deleteGoal(goalId: string) {
  await dbConnect();
  try {
    const userId = await getCurrentUserId();
    const deleted = await Goal.findOneAndDelete({ _id: goalId, userId });
    if (!deleted) {
      return { success: false, error: "Goal not found" };
    }
    await GoalContribution.deleteMany({ userId, goalId });
    revalidatePath("/goals");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete goal"
    };
  }
}
