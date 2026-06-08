"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetSchema, type BudgetFormData } from "@/validations/budget";
import { createBudget, updateBudget } from "@/actions/budget";
import { EXPENSE_CATEGORIES } from "@/constants";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Budget } from "@/types";

import { getUserSettings } from "@/actions/settings";

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget;
  onSuccess?: () => void;
  existingCategories?: string[];
}

export function BudgetForm({
  open,
  onOpenChange,
  budget,
  onSuccess,
  existingCategories = [],
}: BudgetFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);
  const { dateRange, setDashboardDirty } = useUIStore();
  const selectedMonth = dateRange.from.getMonth() + 1;
  const selectedYear = dateRange.from.getFullYear();
  const isEditing = !!budget;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: budget
      ? {
          category: budget.category,
          amount: budget.amount,
          month: budget.month,
          year: budget.year,
        }
      : {
          category: undefined,
          amount: undefined,
          month: selectedMonth,
          year: selectedYear,
        },
  });

  const category = watch("category");

  useEffect(() => {
    if (open) {
      getUserSettings().then((settings) => {
        setCategories(settings.categories || []);
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      reset(
        budget
          ? {
              category: budget.category,
              amount: budget.amount,
              month: budget.month,
              year: budget.year,
            }
          : {
              category: undefined,
              amount: undefined,
              month: selectedMonth,
              year: selectedYear,
            }
      );
    }
  }, [budget, open, reset, selectedMonth, selectedYear]);

  const availableCategories = isEditing
    ? categories.map((c) => c.name)
    : categories.map((c) => c.name).filter((c) => !existingCategories.includes(c));

  const onSubmit = async (data: BudgetFormData) => {
    setLoading(true);
    try {
      const result = isEditing
        ? await updateBudget(budget._id, data)
        : await createBudget({ ...data, month: selectedMonth, year: selectedYear });

      if (result.success) {
        toast.success(isEditing ? "Budget updated" : "Budget created");
        setDashboardDirty(true);
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Budget" : "Create Budget"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category || ""}
              onValueChange={(v) =>
                v && setValue("category", v, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => availableCategories.includes(c.name))
                  .map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      <span className="mr-2">{c.icon}</span>
                      <span>{c.name}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">Budget Amount (₹)</Label>
            <Input
              id="budget-amount"
              type="number"
              step="1"
              placeholder="0"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Create Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
