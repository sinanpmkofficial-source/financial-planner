"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormData } from "@/validations/expense";
import { createExpense, updateExpense } from "@/actions/expense";
import { EXPENSE_CATEGORIES } from "@/constants";
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
import type { Expense } from "@/types";
import { format } from "date-fns";

import { getUserSettings } from "@/actions/settings";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
  onSuccess?: () => void;
}

export function ExpenseForm({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);
  const isEditing = !!expense;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense
      ? {
          amount: expense.amount,
          category: expense.category,
          note: expense.note ?? "",
          date: format(new Date(expense.date), "yyyy-MM-dd"),
        }
      : {
          amount: undefined,
          category: undefined,
          note: "",
          date: format(new Date(), "yyyy-MM-dd"),
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

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const result = isEditing
        ? await updateExpense(expense._id, data)
        : await createExpense(data);

      if (result.success) {
        toast.success(isEditing ? "Expense updated" : "Expense added");
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
            {isEditing ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-amount">Amount (₹)</Label>
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
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
                {categories.map((c) => (
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
            <Label htmlFor="expense-note">Note</Label>
            <Input
              id="expense-note"
              placeholder="Optional note"
              {...register("note")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-date">Date</Label>
            <Input id="expense-date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
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
              {loading
                ? "Saving..."
                : isEditing
                ? "Update"
                : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
