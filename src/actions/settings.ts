"use server";

import { dbConnect } from "@/lib/db";
import UserSettings from "@/models/user-settings";
import Expense from "@/models/expense";
import Budget from "@/models/budget";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";

type CategoryType = { name: string; icon: string; color: string; bucket?: string };

export async function getUserSettings() {
  await dbConnect();
  const userId = await getCurrentUserId();
  let settings = await UserSettings.findOne({ userId }).lean();
  if (!settings) {
    const newSettings = await UserSettings.create({ userId });
    settings = newSettings.toObject();
  }
  return JSON.parse(JSON.stringify(settings));
}

export async function updateUserSettings(data: {
  currency?: string;
  budgetStartDay?: number;
  showGamification?: boolean;
}) {
  try {
    await dbConnect();
    const userId = await getCurrentUserId();
    let settings = await UserSettings.findOne({ userId });
    if (!settings) {
      settings = new UserSettings({ userId });
    }
    if (data.currency !== undefined) settings.currency = data.currency;
    if (data.budgetStartDay !== undefined) settings.budgetStartDay = data.budgetStartDay;
    if (data.showGamification !== undefined) settings.showGamification = data.showGamification;
    
    await settings.save();
    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    revalidatePath("/analytics");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update settings",
    };
  }
}

export async function addCategory(category: CategoryType) {
  try {
    await dbConnect();
    const userId = await getCurrentUserId();
    let settings = await UserSettings.findOne({ userId });
    if (!settings) {
      settings = new UserSettings({ userId });
    }

    const exists = settings.categories.some(
      (c: CategoryType) => c.name.toLowerCase() === category.name.toLowerCase()
    );
    if (exists) {
      return { success: false, error: "Category already exists" };
    }
    
    settings.categories.push(category);
    await settings.save();
    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/budgets");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add category",
    };
  }
}

export async function updateCategory(
  oldName: string,
  category: CategoryType
) {
  try {
    await dbConnect();
    const userId = await getCurrentUserId();
    const settings = await UserSettings.findOne({ userId });
    if (!settings) {
      return { success: false, error: "Settings not found" };
    }

    const catIndex = settings.categories.findIndex(
      (c: CategoryType) => c.name.toLowerCase() === oldName.toLowerCase()
    );
    if (catIndex === -1) {
      return { success: false, error: "Category not found" };
    }
    
    if (oldName.toLowerCase() !== category.name.toLowerCase()) {
      const exists = settings.categories.some(
        (c: CategoryType) => c.name.toLowerCase() === category.name.toLowerCase()
      );
      if (exists) {
        return { success: false, error: "Category name already exists" };
      }
    }
    
    settings.categories[catIndex] = category;
    await settings.save();
    
    if (oldName.toLowerCase() !== category.name.toLowerCase()) {
      await Expense.updateMany({ userId, category: oldName }, { category: category.name });
      await Budget.updateMany({ userId, category: oldName }, { category: category.name });
    }
    
    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    revalidatePath("/analytics");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category",
    };
  }
}

export async function deleteCategory(name: string) {
  try {
    if (name.toLowerCase() === "other") {
      return { success: false, error: "Cannot delete the default 'Other' category" };
    }
    
    await dbConnect();
    const userId = await getCurrentUserId();
    const settings = await UserSettings.findOne({ userId });
    if (!settings) {
      return { success: false, error: "Settings not found" };
    }

    const catIndex = settings.categories.findIndex(
      (c: CategoryType) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (catIndex === -1) {
      return { success: false, error: "Category not found" };
    }
    
    const hasOther = settings.categories.some(
      (c: CategoryType) => c.name.toLowerCase() === "other"
    );
    if (!hasOther) {
      settings.categories.push({ name: "Other", icon: "📁", color: "hsl(200, 15%, 50%)", bucket: "Other" });
    }
    
    settings.categories.splice(catIndex, 1);
    await settings.save();
    
    await Expense.updateMany({ userId, category: name }, { category: "Other" });
    await Budget.deleteMany({ userId, category: name });
    
    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    revalidatePath("/analytics");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}
