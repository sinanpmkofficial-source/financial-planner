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
import { CategoryIcon } from "@/components/shared/category-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SyncStatus } from "@/components/layout/sync-status";
import { Plus, PiggyBank, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getUserSettings } from "@/actions/settings";
import type { BudgetWithSpent } from "@/types";
import { cn } from "@/lib/utils";

export function BudgetsClient() {
  const { 
    dateRange, 
    setDashboardDirty, 
    budgetsCache, 
    updateBudgetsCache, 
    setSyncStatus 
  } = useUIStore();
  
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);
  
  // Use cached data for initial state
  const [loading, setLoading] = useState(budgetsCache.data.length === 0);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpent | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSyncStatus("syncing");
    try {
      const month = dateRange.from.getMonth() + 1;
      const year = dateRange.from.getFullYear();
      const data = await getBudgetsWithSpent(month, year);
      setBudgets(data);
      updateBudgetsCache(data);
    } catch (err) {
      console.error("Failed to fetch budgets", err);
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  }, [dateRange, setSyncStatus, updateBudgetsCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setLoadingSettings(true);
    getUserSettings().then((settings) => {
      setCategories(settings.categories || []);
      setLoadingSettings(false);
    }).catch(() => setLoadingSettings(false));
  }, []);

  const catIconMap = new Map<string, string>(categories.map((c) => [c.name.toLowerCase(), c.icon]));

  const handleDelete = async (id: string) => {
    const result = await deleteBudget(id);
    if (result.success) {
      toast.success("Budget deleted");
      setDashboardDirty(true);
      await fetchData();
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

  const currentBudgets = budgets.length > 0 ? budgets : (budgetsCache.data as BudgetWithSpent[]);
  const totalBudget = currentBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = currentBudgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description={
          <div className="flex flex-col gap-1.5">
            <span>{formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} spent</span>
            <SyncStatus />
          </div>
        }
        showMonthPicker
        action={
          <Button onClick={() => setFormOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Budget
          </Button>
        }
      />

      {loading && currentBudgets.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-5 rounded-xl border border-border/10 bg-card animate-pulse space-y-3.5 shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-16 bg-muted rounded-sm" />
                  <div className="h-2.5 w-24 bg-muted rounded-sm" />
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full" />
              <div className="h-2.5 w-16 bg-muted rounded-sm" />
            </div>
          ))}
        </div>
      ) : currentBudgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets set"
          description="Create budgets for your spending categories to track progress."
          actionLabel="Create Budget"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {currentBudgets.map((budget) => {
            const isWarning = budget.percentage >= 80 && budget.percentage < 100;
            const isDanger = budget.percentage >= 100;

            return (
              <Card
                key={budget._id}
                className={cn(
                  "border bg-card transition-all duration-300",
                  "shadow-[4px_4px_0px_var(--foreground)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]",
                  "md:shadow-none md:hover:shadow-[4px_4px_0px_var(--foreground)] md:dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]",
                  isDanger
                    ? "border-rose-300/80 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/10 md:border-rose-200/50 md:dark:border-rose-900/30 md:hover:border-rose-300"
                    : isWarning
                    ? "border-amber-300/80 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10 md:border-amber-200/50 md:dark:border-amber-900/30 md:hover:border-amber-300"
                    : "border-foreground/30 md:border-foreground/15 md:hover:border-foreground/30"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center border border-border/10 shrink-0">
                        {loadingSettings ? (
                          <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
                        ) : (
                          <CategoryIcon 
                            name={catIconMap.get(budget.category.toLowerCase()) ?? CATEGORY_ICONS[budget.category as ExpenseCategory] ?? "📁"} 
                            className="w-5 h-5" 
                          />
                        )}
                      </div>
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
        existingCategories={currentBudgets.map((b) => b.category)}
      />
    </div>
  );
}
