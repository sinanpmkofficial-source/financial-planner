"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/expenses?add=true">
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </Button>
      </Link>
      <Link href="/income?add=true">
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Income
        </Button>
      </Link>
    </div>
  );
}
