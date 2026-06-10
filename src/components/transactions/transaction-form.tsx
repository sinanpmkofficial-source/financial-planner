"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionFormData } from "@/validations/transaction";
import { createExpense, updateExpense } from "@/actions/expense";
import { type ExpenseFormData } from "@/validations/expense";
import { createIncome, updateIncome } from "@/actions/income";
import { createRecurringExpense } from "@/actions/recurring-expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useUIStore, type Transaction } from "@/stores/ui-store";
import { CategoryIcon } from "@/components/shared/category-icon";

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

  const getTransactionType = useCallback((t?: Expense | Income): "expense" | "income" => {
    if (!t) return defaultType;
    return "category" in t ? "expense" : "income";
  }, [defaultType]);

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
      tag: transaction && "tag" in transaction ? transaction.tag : "Needs",
      source: transaction && "source" in transaction ? transaction.source : "",
      note: transaction?.note ?? "",
      date: transaction
        ? format(new Date(transaction.date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      isRecurring: false,
      frequency: "monthly",
    },
  });

  const { setDashboardDirty, addOptimisticTransaction, setSyncStatus } = useUIStore();

  const type = watch("type");
  const category = watch("category");
  const tag = watch("tag");
  const isRecurring = watch("isRecurring");
  const frequency = watch("frequency");
  const dateValue = watch("date");

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
              tag: "tag" in transaction ? (transaction as Expense).tag : "Needs",
              source: "source" in transaction ? transaction.source : "",
              note: transaction.note ?? "",
              date: format(new Date(transaction.date), "yyyy-MM-dd"),
              isRecurring: false,
              frequency: "monthly",
            }
          : {
              type: defaultType,
              amount: undefined,
              category: undefined,
              tag: "Needs",
              source: "",
              note: "",
              date: format(new Date(), "yyyy-MM-dd"),
              isRecurring: false,
              frequency: "monthly",
            }
      );
    }
  }, [transaction, open, reset, defaultType, getTransactionType]);

  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);

    // Create optimistic object for immediate LocalStorage update
    const optimisticId = `temp-${Date.now()}`;
    const optimisticTransaction = {
      _id: optimisticId,
      amount: data.amount,
      note: data.note,
      date: new Date(data.date).toISOString(),
      ...(data.type === "expense" 
        ? { category: data.category || "", tag: data.tag || "Needs" } 
        : { source: data.source || "" }
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Transaction;

    if (!isEditing) {
      addOptimisticTransaction(optimisticTransaction);
    }

    try {
      let result;
      if (data.type === "expense") {
        const expensePayload: ExpenseFormData = {
          amount: data.amount,
          category: data.category || "",
          tag: (data.tag || "Needs") as "Needs" | "Wants" | "Investments" | "Unnecessary Spending",
          note: data.note,
          date: data.date,
        };
        result = isEditing
          ? await updateExpense(transaction._id, expensePayload)
          : await createExpense(expensePayload);

        if (result.success && !isEditing && data.isRecurring) {
          // Calculate next due date
          const d = new Date(data.date);
          if (data.frequency === "weekly") {
            d.setDate(d.getDate() + 7);
          } else if (data.frequency === "monthly") {
            d.setMonth(d.getMonth() + 1);
          } else if (data.frequency === "yearly") {
            d.setFullYear(d.getFullYear() + 1);
          }
          
          await createRecurringExpense({
            amount: data.amount,
            category: data.category || "",
            tag: data.tag || "Needs",
            note: data.note,
            frequency: data.frequency || "monthly",
            nextDueDate: d.toISOString(),
          });
        }
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
        setSyncStatus("error");
        toast.error(result.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setSyncStatus("error");
      toast.error("Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                <CategoryIcon name="💸" className="w-3.5 h-3.5" /> Expense
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
                <CategoryIcon name="💰" className="w-3.5 h-3.5" /> Income
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
            <>
              {/* Category */}
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
                        <div className="flex items-center gap-2">
                          <CategoryIcon name={c.icon} className="w-3.5 h-3.5" />
                          <span>{c.name}</span>
                        </div>
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

              {/* Tagging Grid */}
              <div className="space-y-2">
                <Label>Financial Tag (50-30-20 Rule)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "Needs", label: "Needs (50%)", desc: "Bills, groceries, rent" },
                    { value: "Wants", label: "Wants (30%)", desc: "Eating out, fun, shopping" },
                    { value: "Investments", label: "Investments (20%)", desc: "SIP, stocks, savings" },
                    { value: "Unnecessary Spending", label: "Wasted Money (0%)", desc: "Impulse, unused subs" },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setValue("tag", t.value as "Needs" | "Wants" | "Investments" | "Unnecessary Spending", { shouldValidate: true })}
                      className={cn(
                        "flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer",
                        tag === t.value
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/10"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <span className="font-semibold text-xs text-foreground block">{t.label}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</span>
                    </button>
                  ))}
                </div>
                {errors.tag && (
                  <p className="text-xs text-destructive">{errors.tag.message}</p>
                )}
              </div>

              {/* Make Recurring Toggle */}
              {!isEditing && (
                <div className="space-y-2 p-3 bg-muted/30 border border-border/40 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="make-recurring" className="text-xs font-semibold cursor-pointer">
                        Make Recurring Expense
                      </Label>
                      <p className="text-[9px] text-muted-foreground leading-tight">
                        Receive a bill reminder on the next due date (no auto-logging)
                      </p>
                    </div>
                    <input
                      id="make-recurring"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                      checked={!!isRecurring}
                      onChange={(e) => setValue("isRecurring", e.target.checked)}
                    />
                  </div>

                  {isRecurring && (
                    <div className="space-y-2 pt-2 border-t border-border/40 transition-all">
                      <Label className="text-[11px] font-semibold text-foreground">Reminder Frequency</Label>
                      <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted rounded-md border border-border/40">
                        {["weekly", "monthly", "yearly"].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setValue("frequency", f as "weekly" | "monthly" | "yearly")}
                            className={cn(
                              "py-1 text-[10px] font-semibold rounded-sm transition-all cursor-pointer capitalize",
                              frequency === f
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
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
          <div className="space-y-2 flex flex-col">
            <Label htmlFor="transaction-date">Date</Label>
            <DatePicker
              date={dateValue ? new Date(dateValue) : new Date()}
              onSelect={(d) => {
                if (d) {
                  setValue("date", format(d, "yyyy-MM-dd"), { shouldValidate: true });
                }
              }}
            />
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
