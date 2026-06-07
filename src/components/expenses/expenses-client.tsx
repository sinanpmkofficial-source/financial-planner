"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getExpenses, deleteExpense } from "@/actions/expense";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_ICONS, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/constants";
import { PageHeader } from "@/components/layout/header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  const { selectedMonth, selectedYear } = useUIStore();
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
      const data = await getExpenses(selectedMonth, selectedYear);
      setExpenses(data);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

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
      fetchData();
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
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
              className="border border-border/50 shadow-sm"
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
