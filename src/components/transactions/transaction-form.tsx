"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionFormData } from "@/validations/transaction";
import { createExpense, updateExpense } from "@/actions/expense";
import { createIncome, updateIncome } from "@/actions/income";
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
import type { Expense, Income } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getUserSettings } from "@/actions/settings";
import { useUIStore } from "@/stores/ui-store";

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Expense | Income;
  defaultType?: "expense" | "income";
  onSuccess?: () => void;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  defaultType = "expense",
  onSuccess,
}: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);
  const isEditing = !!transaction;

  const getTransactionType = (t?: Expense | Income): "expense" | "income" => {
    if (!t) return defaultType;
    return "category" in t ? "expense" : "income";
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: getTransactionType(transaction),
      amount: transaction?.amount ?? undefined,
      category: transaction && "category" in transaction ? transaction.category : undefined,
      source: transaction && "source" in transaction ? transaction.source : "",
      note: transaction?.note ?? "",
      date: transaction
        ? format(new Date(transaction.date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    },
  });

  const { setDashboardDirty } = useUIStore();

  const type = watch("type");
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
      const currentType = getTransactionType(transaction);
      reset(
        transaction
          ? {
              type: currentType,
              amount: transaction.amount,
              category: "category" in transaction ? transaction.category : undefined,
              source: "source" in transaction ? transaction.source : "",
              note: transaction.note ?? "",
              date: format(new Date(transaction.date), "yyyy-MM-dd"),
            }
          : {
              type: defaultType,
              amount: undefined,
              category: undefined,
              source: "",
              note: "",
              date: format(new Date(), "yyyy-MM-dd"),
            }
      );
    }
  }, [transaction, open, reset, defaultType]);

  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);
    try {
      let result;
      if (data.type === "expense") {
        const expensePayload = {
          amount: data.amount,
          category: data.category || "",
          note: data.note,
          date: data.date,
        };
        result = isEditing
          ? await updateExpense(transaction._id, expensePayload)
          : await createExpense(expensePayload);
      } else {
        const incomePayload = {
          amount: data.amount,
          source: data.source || "",
          note: data.note,
          date: data.date,
        };
        result = isEditing
          ? await updateIncome(transaction._id, incomePayload)
          : await createIncome(incomePayload);
      }

      if (result.success) {
        toast.success(
          isEditing
            ? `${data.type === "expense" ? "Expense" : "Income"} updated`
            : `${data.type === "expense" ? "Expense" : "Income"} added`
        );
        setDashboardDirty(true);
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit ${type === "expense" ? "Expense" : "Income"}`
              : `Add ${type === "expense" ? "Expense" : "Income"}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Segmented type toggle, only enabled when creating a new record */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg border border-border/50">
              <button
                type="button"
                disabled={isEditing}
                onClick={() => setValue("type", "expense", { shouldValidate: true })}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  type === "expense"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                  isEditing && "opacity-60 cursor-not-allowed"
                )}
              >
                💸 Expense
              </button>
              <button
                type="button"
                disabled={isEditing}
                onClick={() => setValue("type", "income", { shouldValidate: true })}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  type === "income"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                  isEditing && "opacity-60 cursor-not-allowed"
                )}
              >
                💰 Income
              </button>
            </div>
          </div>

          {/* Amount field */}
          <div className="space-y-2">
            <Label htmlFor="transaction-amount">Amount (₹)</Label>
            <Input
              id="transaction-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Type-specific fields */}
          {type === "expense" ? (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category || ""}
                onValueChange={(v) =>
                  setValue("category", v || undefined, {
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
          ) : (
            <div className="space-y-2">
              <Label htmlFor="transaction-source">Source</Label>
              <Input
                id="transaction-source"
                placeholder="e.g. Salary, Freelance"
                {...register("source")}
              />
              {errors.source && (
                <p className="text-xs text-destructive">{errors.source.message}</p>
              )}
            </div>
          )}

          {/* Note field */}
          <div className="space-y-2">
            <Label htmlFor="transaction-note">Note</Label>
            <Input
              id="transaction-note"
              placeholder="Optional note"
              {...register("note")}
            />
          </div>

          {/* Date field */}
          <div className="space-y-2">
            <Label htmlFor="transaction-date">Date</Label>
            <Input id="transaction-date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 cursor-pointer" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditing
                ? "Update"
                : `Add ${type === "expense" ? "Expense" : "Income"}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
