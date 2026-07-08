"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import { getBudgetsWithSpent, deleteBudget } from "@/actions/budget";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_ICONS, type ExpenseCategory } from "@/constants";
import { CategoryIcon } from "@/components/shared/category-icon";
import { PageHeader } from "@/components/layout/header";
import { BudgetForm } from "@/components/budgets/budget-form";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, PiggyBank, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getUserSettings } from "@/actions/settings";
import type { BudgetWithSpent } from "@/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 90, damping: 15 }
  }
} as const;


export function BudgetsClient() {
  const { setDashboardDirty, budgetsCache, updateBudgetsCache } = useUIStore();
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<
    BudgetWithSpent | undefined
  >();

  // Budgets always operate on the current month, independent of any global period.
  const now = new Date();
  const cacheKey = `${now.getMonth() + 1}-${now.getFullYear()}`;

  // Hydrate budgets state from local cache on client mount / period change
  useEffect(() => {
    const cached = budgetsCache[cacheKey];
    if (cached) {
      setBudgets(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [cacheKey, budgetsCache]);

  const fetchData = useCallback(async () => {
    const currentCache = useUIStore.getState().budgetsCache[cacheKey];
    if (!currentCache) {
      setLoading(true);
    }
    try {
      const d = new Date();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const data = await getBudgetsWithSpent(month, year);
      setBudgets(data);
      updateBudgetsCache(cacheKey, data);
    } catch (err) {
      console.error("Failed to fetch budgets", err);
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, updateBudgetsCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getUserSettings().then((settings) => {
      setCategories(settings.categories || []);
    });
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

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description={`${formatCurrency(totalSpent)} of ${formatCurrency(totalBudget)} spent`}
        action={
          <Button onClick={() => setFormOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Budget
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-5 rounded-xl border border-border/20 bg-card animate-pulse space-y-3.5">
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
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets set"
          description="Create budgets for your spending categories to track progress."
          actionLabel="Create Budget"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2"
        >
          {budgets.map((budget) => {
            const isWarning = budget.percentage >= 80 && budget.percentage < 100;
            const isDanger = budget.percentage >= 100;

            return (
              <motion.div key={budget._id} variants={itemVariants}>
                <Card
                  className={cn(
                    "border bg-card transition-all duration-300 h-full",
                    isDanger
                      ? "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/30"
                      : isWarning
                      ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30"
                      : "border-border/50 hover:border-border hover:shadow-[0_4px_12px_oklch(0_0_0/8%)] dark:hover:shadow-[0_4px_14px_oklch(0_0_0/40%)]"
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <CategoryIcon
                          name={catIconMap.get(budget.category.toLowerCase()) ?? CATEGORY_ICONS[budget.category as ExpenseCategory] ?? "Tag"}
                          className="w-5 h-5 text-muted-foreground"
                        />
                        <div>
                          <p className="font-medium text-sm">{budget.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(budget.spent)} /&nbsp;
                            {formatCurrency(budget.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            isDanger
                              ? "text-rose-500"
                              : isWarning
                              ? "text-amber-500"
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
                        isDanger && "[&_[data-slot=progress-indicator]]:bg-rose-500",
                        isWarning && "[&_[data-slot=progress-indicator]]:bg-amber-500"
                      )}
                    />

                    <p className="text-xs text-muted-foreground mt-2">
                      {formatCurrency(budget.remaining)} remaining
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
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
