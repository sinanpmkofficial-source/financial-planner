"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionFormData } from "@/validations/transaction";
import { createExpense, updateExpense } from "@/actions/expense";
import { type ExpenseFormData } from "@/validations/expense";
import { createIncome, updateIncome } from "@/actions/income";
import { createRecurringExpense, updateRecurringExpense, deleteRecurringExpense, getRecurringExpenses } from "@/actions/recurring-expense";
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
import type { Expense, Income, RecurringExpense } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/shared/category-icon";
import { toPaise, toRupees } from "@/lib/money";
import { getUserSettings } from "@/actions/settings";
import { useUIStore } from "@/stores/ui-store";
import { Loader2, TrendingDown, TrendingUp, Repeat } from "lucide-react";

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
  const [time, setTime] = useState<string>(format(new Date(), "HH:mm"));
  // Seed from the cached settings so the category list is populated the instant
  // the modal opens, instead of flashing empty while the fetch is in flight.
  const [categories, setCategories] = useState<{ name: string; icon: string; color: string }[]>(
    () => (useUIStore.getState().dashboardCache?.settings?.categories as { name: string; icon: string; color: string }[]) || []
  );
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
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
      amount: transaction?.amount != null ? toRupees(transaction.amount) : undefined,
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

  const { setDashboardDirty, updateDashboardCache } = useUIStore();

  // Fetch categories defensively: never blank out a populated list on a
  // transient failure or an empty response, and cache good results for reuse.
  const loadCategories = useCallback(async () => {
    try {
      const settings = await getUserSettings();
      const cats = (settings?.categories || []) as { name: string; icon: string; color: string }[];
      if (cats.length > 0) {
        setCategories(cats);
        updateDashboardCache({ settings });
      }
    } catch (err) {
      console.error("Failed to load categories for transaction form", err);
    }
  }, [updateDashboardCache]);

  const type = watch("type");
  const category = watch("category");
  const tag = watch("tag");
  const isRecurring = watch("isRecurring");
  const frequency = watch("frequency");
  const dateValue = watch("date");

  // Shared minimal field-label style: small, muted, uppercase.
  const fieldLabel =
    "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

  // Amount input, reused so it can sit beside Category (expense) at equal size,
  // or stand alone (income). Kept bold + colored but at the standard field height.
  const amountField = (
    <div className="space-y-1.5">
      <Label htmlFor="transaction-amount" className={fieldLabel}>Amount</Label>
      <Input
        id="transaction-amount"
        type="number"
        step="0.01"
        placeholder="0.00"
        className={cn(
          "!h-10 !text-base !font-bold",
          type === "expense"
            ? "text-rose-600 dark:text-rose-400"
            : "text-emerald-600 dark:text-emerald-400"
        )}
        {...register("amount", { valueAsNumber: true })}
      />
      {errors.amount && (
        <p className="text-xs text-destructive">{errors.amount.message}</p>
      )}
    </div>
  );

  // Preload categories as soon as the form mounts, so they're ready before the
  // user ever opens the modal.
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (open) {
      loadCategories();
      getRecurringExpenses().then((recs) => {
        setRecurringExpenses(recs || []);
      });
    }
  }, [open, loadCategories]);

  useEffect(() => {
    if (open) {
      const currentType = getTransactionType(transaction);
      const isRec = !!(transaction && "recurringExpenseId" in transaction && transaction.recurringExpenseId);
      const matchedRec = isRec
        ? recurringExpenses.find(r => r._id === (transaction as Expense).recurringExpenseId)
        : null;

      // Seed the time picker from the existing transaction, or "now" for a new one.
      setTime(format(transaction ? new Date(transaction.date) : new Date(), "HH:mm"));

      reset(
        transaction
          ? {
              type: currentType,
              amount: toRupees(transaction.amount),
              category: "category" in transaction ? transaction.category : undefined,
              tag: "tag" in transaction ? (transaction as Expense).tag : "Needs",
              source: "source" in transaction ? transaction.source : "",
              note: transaction.note ?? "",
              date: format(new Date(transaction.date), "yyyy-MM-dd"),
              isRecurring: isRec,
              frequency: matchedRec ? matchedRec.frequency : "monthly",
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
  }, [transaction, open, reset, defaultType, recurringExpenses]);

  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);
    try {
      // Combine the picked date with the time field into a local datetime string
      // (e.g. "2026-07-09T14:30"), which `new Date(...)` parses as local time.
      const dateTime = time ? `${data.date}T${time}` : data.date;
      let result;
      if (data.type === "expense") {
        const expensePayload: ExpenseFormData = {
          amount: toPaise(data.amount),
          category: data.category || "",
          tag: (data.tag || "Needs") as "Needs" | "Wants" | "Investments" | "Unnecessary Spending",
          note: data.note,
          date: dateTime,
        };
        const recurringExpenseId = transaction && "recurringExpenseId" in transaction ? transaction.recurringExpenseId : undefined;
        result = isEditing
          ? await updateExpense(transaction._id, expensePayload)
          : await createExpense(expensePayload);

        if (result.success) {
          if (data.isRecurring) {
            const d = new Date(data.date);
            if (data.frequency === "weekly") {
              d.setDate(d.getDate() + 7);
            } else if (data.frequency === "monthly") {
              d.setMonth(d.getMonth() + 1);
            } else if (data.frequency === "yearly") {
              d.setFullYear(d.getFullYear() + 1);
            }

            if (isEditing && recurringExpenseId) {
              // Update existing template
              await updateRecurringExpense(recurringExpenseId, {
                amount: toPaise(data.amount),
                category: data.category || "",
                tag: (data.tag || "Needs") as "Needs" | "Wants" | "Investments" | "Unnecessary Spending",
                note: data.note,
                frequency: data.frequency || "monthly",
              });
            } else {
              // Create new template
              const recResult = await createRecurringExpense({
                amount: toPaise(data.amount),
                category: data.category || "",
                tag: (data.tag || "Needs") as "Needs" | "Wants" | "Investments" | "Unnecessary Spending",
                note: data.note,
                frequency: data.frequency || "monthly",
                nextDueDate: d.toISOString(),
              });

              if (recResult.success && isEditing) {
                // Link new template to existing transaction
                await updateExpense(transaction._id, {
                  ...expensePayload,
                  recurringExpenseId: recResult.id,
                });
              }
            }
          } else {
            // isRecurring toggled to false
            if (isEditing && recurringExpenseId) {
              await deleteRecurringExpense(recurringExpenseId);
              await updateExpense(transaction._id, {
                ...expensePayload,
                recurringExpenseId: "", // unsets it
              });
            }
          }
        }
      } else {
        const incomePayload = {
          amount: toPaise(data.amount),
          source: data.source || "",
          note: data.note,
          date: dateTime,
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
      <DialogContent className="sm:max-w-md max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3.5 border-b border-border/60 shrink-0">
          <DialogTitle>
            {isEditing
              ? `Edit ${type === "expense" ? "Expense" : "Income"}`
              : "New Transaction"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
          {/* Scrollable body — only this region scrolls; header & footer stay fixed */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* Segmented type toggle, only enabled when creating a new record */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isEditing}
                onClick={() => setValue("type", "expense", { shouldValidate: true })}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer",
                  type === "expense"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "border-border text-muted-foreground hover:bg-muted/40",
                  isEditing && "opacity-60 cursor-not-allowed"
                )}
              >
                <TrendingDown className="w-4 h-4" /> Expense
              </button>
              <button
                type="button"
                disabled={isEditing}
                onClick={() => setValue("type", "income", { shouldValidate: true })}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer",
                  type === "income"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border text-muted-foreground hover:bg-muted/40",
                  isEditing && "opacity-60 cursor-not-allowed"
                )}
              >
                <TrendingUp className="w-4 h-4" /> Income
              </button>
            </div>
          </div>

          {/* Type-specific fields */}
          {type === "expense" ? (
            <>
              {/* Amount + Category — same row, equal width */}
              <div className="grid grid-cols-2 gap-3">
                {amountField}
                <div className="space-y-1.5">
                  <Label className={fieldLabel}>Category</Label>
                  <Select
                    value={category || ""}
                    onValueChange={(v) =>
                      setValue("category", v || undefined, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category">
                        {category && categories.length === 0 ? "" : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          <span className="mr-2 inline-flex" style={{ color: c.color }}>
                            <CategoryIcon name={c.icon} className="w-4 h-4" />
                          </span>
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
              </div>

              {/* Tagging Grid */}
              <div className="space-y-1.5">
                <Label className={fieldLabel}>Financial Tag</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "Needs", label: "Needs", desc: "Bills, groceries, rent", color: "hsl(142, 72%, 45%)" },
                    { value: "Wants", label: "Wants", desc: "Eating out, fun, shopping", color: "hsl(43, 90%, 50%)" },
                    { value: "Investments", label: "Investments", desc: "SIP, stocks, savings", color: "hsl(217, 91%, 60%)" },
                    { value: "Unnecessary Spending", label: "Wasted Money", desc: "Impulse, unused subs", color: "hsl(0, 75%, 58%)" },
                  ].map((t) => {
                    const selected = tag === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setValue("tag", t.value as "Needs" | "Wants" | "Investments" | "Unnecessary Spending", { shouldValidate: true })}
                        className={cn(
                          "flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                          selected
                            ? "bg-muted/50 ring-1"
                            : "border-border hover:bg-muted/40"
                        )}
                        style={selected ? { borderColor: t.color, boxShadow: `0 0 0 1px ${t.color}` } : undefined}
                      >
                        <span
                          className="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.color, opacity: selected ? 1 : 0.5 }}
                        />
                        <span className="min-w-0">
                          <span className={cn("font-semibold text-xs block", selected ? "text-foreground" : "text-foreground/90")}>{t.label}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">{t.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.tag && (
                  <p className="text-xs text-destructive">{errors.tag.message}</p>
                )}
              </div>

              {/* Make Recurring Toggle */}
              <div className="space-y-2 p-3 bg-muted/30 border border-border/40 rounded-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                      <Repeat className="w-3.5 h-3.5" />
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <Label htmlFor="make-recurring" className="text-xs font-semibold cursor-pointer">
                        Make Recurring Expense
                      </Label>
                    </div>
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
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {amountField}
              <div className="space-y-1.5">
                <Label htmlFor="transaction-source" className={fieldLabel}>Source</Label>
                <Input
                  id="transaction-source"
                  placeholder="e.g. Salary, Freelance"
                  className="h-10"
                  {...register("source")}
                />
                {errors.source && (
                  <p className="text-xs text-destructive">{errors.source.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Note field */}
          <div className="space-y-1.5">
            <Label htmlFor="transaction-note" className={fieldLabel}>Note</Label>
            <Input
              id="transaction-note"
              placeholder="Optional note"
              {...register("note")}
            />
          </div>

          {/* Date + Time fields */}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1.5 flex flex-col min-w-0">
              <Label htmlFor="transaction-date" className={fieldLabel}>Date</Label>
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
            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="transaction-time" className={fieldLabel}>Time</Label>
              <Input
                id="transaction-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          </div>

          {/* Footer actions — pinned below the scroll region */}
          <div className="shrink-0 flex gap-2 px-5 sm:px-6 py-4 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 cursor-pointer mt-3"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 cursor-pointer flex items-center justify-center mt-3" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                "Save changes"
              ) : (
                `Add ${type === "expense" ? "Expense" : "Income"}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
