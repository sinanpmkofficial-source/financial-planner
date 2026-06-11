import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_ICONS, type ExpenseCategory } from "@/constants";
import type { BudgetWithSpent } from "@/types";
import { AlertTriangle } from "lucide-react";

interface BudgetAlertsProps {
  budgets: BudgetWithSpent[];
  loading?: boolean;
  categories?: { name: string; icon: string }[];
}

export function BudgetAlerts({ 
  budgets, 
  loading = false,
  categories = [],
}: BudgetAlertsProps) {
  const warningBudgets = budgets.filter((b) => b.percentage >= 80);

  const catIconMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.icon]));

  if (loading) {
    return (
      <Card className="border border-amber-200 bg-amber-50/30 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
            Budget Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted animate-pulse rounded-sm" />
                <div className="h-4 w-8 bg-muted animate-pulse rounded-sm" />
              </div>
              <div className="h-1.5 bg-muted animate-pulse rounded-full" />
              <div className="h-3 w-28 bg-muted animate-pulse rounded-sm" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (warningBudgets.length === 0) return null;

  return (
    <Card className="border border-amber-200 bg-amber-50/30 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Budget Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {warningBudgets.map((b) => (
          <div key={b._id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const icon = catIconMap.get(b.category.toLowerCase()) ?? CATEGORY_ICONS[b.category as ExpenseCategory] ?? "📌";
                  const isEmoji = icon.length <= 2;
                  return (
                    <span className={isEmoji ? "text-sm shrink-0" : "text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold shrink-0"}>
                      {icon}
                    </span>
                  );
                })()}
                <span className="text-sm font-medium">{b.category}</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  b.percentage >= 100 ? "text-rose-600" : "text-amber-600"
                }`}
              >
                {b.percentage}%
              </span>
            </div>
            <Progress
              value={Math.min(b.percentage, 100)}
              className={`h-1.5 ${
                b.percentage >= 100 ? "[&>div]:bg-rose-500" : "[&>div]:bg-amber-500"
              }`}
            />
            <p className="text-xs text-muted-foreground">
              {formatCurrency(b.spent)} of {formatCurrency(b.amount)} spent
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
