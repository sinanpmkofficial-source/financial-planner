import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { CATEGORY_ICONS, type ExpenseCategory } from "@/constants";
import { CategoryIcon } from "@/components/shared/category-icon";
import type { Expense, Income } from "@/types";
import { cn } from "@/lib/utils";

interface RecentTransactionsProps {
  expenses: Expense[];
  incomes: Income[];
  categories?: { name: string; icon: string }[];
  loading?: boolean;
}

type Transaction = {
  id: string;
  amount: number;
  label: string;
  date: string;
  createdAt?: string;
  type: "expense" | "income";
  icon?: string;
};

export function RecentTransactions({
  expenses,
  incomes,
  categories = [],
  loading = false,
}: RecentTransactionsProps) {
  const catIconMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.icon]));

  const transactions: Transaction[] = [
    ...expenses.map((e) => ({
      id: e._id,
      amount: e.amount,
      label: e.category,
      date: e.date,
      createdAt: e.createdAt,
      type: "expense" as const,
      icon: catIconMap.get(e.category.toLowerCase()) ?? CATEGORY_ICONS[e.category as ExpenseCategory] ?? "📌",
    })),
    ...incomes.map((i) => ({
      id: i._id,
      amount: i.amount,
      label: i.source,
      date: i.date,
      createdAt: i.createdAt,
      type: "income" as const,
    })),
  ]
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeB - timeA;
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    })
    .slice(0, 7);


  if (loading) {
    return (
      <Card className="border border-border/50 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 bg-muted animate-pulse rounded-sm" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded-sm" />
                  <div className="h-4 w-12 bg-muted animate-pulse rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return null;
  }
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={t.type === "income" ? "text-emerald-500" : "text-muted-foreground"}>
                  <CategoryIcon name={t.icon ?? "Wallet"} className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateShort(t.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    t.type === "income" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
                <Badge
                  variant={t.type === "income" ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {t.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
