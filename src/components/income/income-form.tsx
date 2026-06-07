"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { incomeSchema, type IncomeFormData } from "@/validations/income";
import { createIncome, updateIncome } from "@/actions/income";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Income } from "@/types";
import { format } from "date-fns";

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income;
  onSuccess?: () => void;
}

export function IncomeForm({
  open,
  onOpenChange,
  income,
  onSuccess,
}: IncomeFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!income;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: income
      ? {
          amount: income.amount,
          source: income.source,
          note: income.note ?? "",
          date: format(new Date(income.date), "yyyy-MM-dd"),
        }
      : {
          amount: undefined,
          source: "",
          note: "",
          date: format(new Date(), "yyyy-MM-dd"),
        },
  });

  const onSubmit = async (data: IncomeFormData) => {
    setLoading(true);
    try {
      const result = isEditing
        ? await updateIncome(income._id, data)
        : await createIncome(data);

      if (result.success) {
        toast.success(isEditing ? "Income updated" : "Income added");
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
            {isEditing ? "Edit Income" : "Add Income"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="income-amount">Amount (₹)</Label>
            <Input
              id="income-amount"
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
            <Label htmlFor="income-source">Source</Label>
            <Input
              id="income-source"
              placeholder="e.g. Salary, Freelance"
              {...register("source")}
            />
            {errors.source && (
              <p className="text-xs text-destructive">{errors.source.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-note">Note</Label>
            <Input
              id="income-note"
              placeholder="Optional note"
              {...register("note")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-date">Date</Label>
            <Input id="income-date" type="date" {...register("date")} />
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
              {loading ? "Saving..." : isEditing ? "Update" : "Add Income"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
