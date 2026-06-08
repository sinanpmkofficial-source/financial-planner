"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface QuickActionsProps {
  onRecordTransaction?: () => void;
  disabled?: boolean;
}

export function QuickActions({
  onRecordTransaction,
  disabled = false,
}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="gap-1.5 cursor-pointer" onClick={onRecordTransaction} disabled={disabled}>
        <Plus className="w-3.5 h-3.5" />
        Record Transaction
      </Button>
    </div>
  );
}
