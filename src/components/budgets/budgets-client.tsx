"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import { getBudgetsWithSpent, deleteBudget } from "@/actions/budget";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_ICONS, type ExpenseCategory } from "@/constants";
import { PageHeader } from "@/components/layout/header";
import { BudgetForm } from "@/components/budgets/budget-form";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, PiggyBank, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { BudgetWithSpent } from "@/types";
import { cn } from "@/lib/utils";

export function BudgetsClient() {
  const { selectedMonth, selectedYear } = useUIStore();
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<
    BudgetWithSpent | undefined
  >();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBudgetsWithSpent(selectedMonth, selectedYear);
      setBudgets(data);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const result = await deleteBudget(id);
    if (result.success) {
      toast.success("Budget deleted");
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = (budget: BudgetWithSpent) => {
    setEditingBudget(budget);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingBudget(undefined);
  };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description={`${formatCurrency(totalSpent)} of ${formatCurrency(totalBudget)} spent`}
        showMonthPicker
        action={
          <Button onClick={() => setFormOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Budget
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets set"
          description="Create budgets for your spending categories to track progress."
          actionLabel="Create Budget"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((budget) => {
            const isWarning = budget.percentage >= 80 && budget.percentage < 100;
            const isDanger = budget.percentage >= 100;

            return (
              <Card
                key={budget._id}
                className={cn(
                  "border shadow-sm",
                  isDanger
                    ? "border-rose-200 bg-rose-50/20"
                    : isWarning
                    ? "border-amber-200 bg-amber-50/20"
                    : "border-border/50"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">
                        {CATEGORY_ICONS[budget.category as ExpenseCategory]}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{budget.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(budget.spent)} /{" "}
                          {formatCurrency(budget.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          isDanger
                            ? "text-rose-600"
                            : isWarning
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {budget.percentage}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => handleEdit(budget)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <ConfirmDelete
                        onConfirm={() => handleDelete(budget._id)}
                      />
                    </div>
                  </div>

                  <Progress
                    value={Math.min(budget.percentage, 100)}
                    className={cn(
                      "h-2",
                      isDanger && "[&>div]:bg-rose-500",
                      isWarning && "[&>div]:bg-amber-500"
                    )}
                  />

                  <p className="text-xs text-muted-foreground mt-2">
                    {formatCurrency(budget.remaining)} remaining
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onOpenChange={handleFormClose}
        budget={editingBudget}
        onSuccess={fetchData}
        existingCategories={budgets.map((b) => b.category)}
      />
    </div>
  );
}
