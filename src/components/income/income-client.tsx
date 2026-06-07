"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getIncomes, deleteIncome, getIncomesByDateRange } from "@/actions/income";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/header";
import { IncomeForm } from "@/components/income/income-form";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Wallet, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Income } from "@/types";

export function IncomeClient() {
  const { dateRange } = useUIStore();
  const searchParams = useSearchParams();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIncomesByDateRange(dateRange.from, dateRange.to);
      setIncomes(data);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setFormOpen(true);
    }
  }, [searchParams]);

  const handleDelete = async (id: string) => {
    const result = await deleteIncome(id);
    if (result.success) {
      toast.success("Income deleted");
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingIncome(undefined);
  };

  const total = incomes.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description={`${incomes.length} entries · ${formatCurrency(total)}`}
        showMonthPicker
        action={
          <Button onClick={() => setFormOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Income
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : incomes.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No income recorded"
          description="Start tracking your income by adding your first entry."
          actionLabel="Add Income"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {incomes.map((income) => (
            <Card
              key={income._id}
              className={cn(
                "border bg-card transition-all duration-300",
                "shadow-[4px_4px_0px_var(--foreground)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.85)] border-foreground/30",
                "md:shadow-none md:border-foreground/15 md:hover:border-foreground/30 md:hover:shadow-[4px_4px_0px_var(--foreground)] md:dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💰</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{income.source}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {formatDate(income.date)}
                        </Badge>
                      </div>
                      {income.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {income.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-600">
                      +{formatCurrency(income.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => handleEdit(income)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <ConfirmDelete
                      onConfirm={() => handleDelete(income._id)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <IncomeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        income={editingIncome}
        onSuccess={fetchData}
      />
    </div>
  );
}
