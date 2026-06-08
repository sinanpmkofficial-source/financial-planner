"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface QuickActionsProps {
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  disabled?: boolean;
}

export function QuickActions({
  onAddExpense,
  onAddIncome,
  disabled = false,
}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="gap-1.5 cursor-pointer" onClick={onAddExpense} disabled={disabled}>
        <Plus className="w-3.5 h-3.5" />
        Add Expense
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer" onClick={onAddIncome} disabled={disabled}>
        <Plus className="w-3.5 h-3.5" />
        Add Income
      </Button>
    </div>
  );
}
