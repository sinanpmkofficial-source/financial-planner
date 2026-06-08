"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getExpenses, deleteExpense, getExpensesByDateRange } from "@/actions/expense";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_ICONS, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/constants";
import { PageHeader } from "@/components/layout/header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Receipt, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Expense } from "@/types";

import { getUserSettings } from "@/actions/settings";

export function ExpensesClient() {
  const { dateRange } = useUIStore();
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpensesByDateRange(dateRange.from, dateRange.to);
      setExpenses(data);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getUserSettings().then((settings) => {
      setCategories(settings.categories || []);
    });
  }, []);

  const catIconMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.icon]));

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setFormOpen(true);
    }
  }, [searchParams]);

  const handleDelete = async (id: string) => {
    const result = await deleteExpense(id);
    if (result.success) {
      toast.success("Expense deleted");
      await fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingExpense(undefined);
  };

  const filtered =
    filterCategory === "all"
      ? expenses
      : expenses.filter((e) => e.category === filterCategory);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description={`${filtered.length} entries · ${formatCurrency(total)}`}
        showMonthPicker
        action={
          <Button onClick={() => setFormOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Expense
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterCategory} onValueChange={(val) => val && setFilterCategory(val)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📁 All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/10 bg-card animate-pulse shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-muted rounded-sm" />
                  <div className="h-3 w-16 bg-muted rounded-sm" />
                </div>
              </div>
              <div className="h-4 w-12 bg-muted rounded-sm" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Start tracking your spending by adding your first expense."
          actionLabel="Add Expense"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <Card
              key={expense._id}
              className={cn(
                "border bg-card transition-all duration-300",
                "shadow-[4px_4px_0px_var(--foreground)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.85)] border-foreground/30",
                "md:shadow-none md:border-foreground/15 md:hover:border-foreground/30 md:hover:shadow-[4px_4px_0px_var(--foreground)] md:dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {catIconMap.get(expense.category.toLowerCase()) ?? CATEGORY_ICONS[expense.category as ExpenseCategory] ?? "📌"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {expense.category}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          {formatDate(expense.date)}
                        </Badge>
                      </div>
                      {expense.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {expense.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-rose-600">
                      -{formatCurrency(expense.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => handleEdit(expense)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <ConfirmDelete
                      onConfirm={() => handleDelete(expense._id)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExpenseForm
        open={formOpen}
        onOpenChange={handleFormClose}
        expense={editingExpense}
        onSuccess={fetchData}
      />
    </div>
  );
}
