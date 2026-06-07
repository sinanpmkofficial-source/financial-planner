import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { CATEGORY_ICONS, type ExpenseCategory } from "@/constants";
import type { Expense, Income } from "@/types";

interface RecentTransactionsProps {
  expenses: Expense[];
  incomes: Income[];
  categories?: { name: string; icon: string }[];
}

type Transaction = {
  id: string;
  amount: number;
  label: string;
  date: string;
  type: "expense" | "income";
  icon?: string;
};

export function RecentTransactions({
  expenses,
  incomes,
  categories = [],
}: RecentTransactionsProps) {
  const catIconMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.icon]));

  const transactions: Transaction[] = [
    ...expenses.map((e) => ({
      id: e._id,
      amount: e.amount,
      label: e.category,
      date: e.date,
      type: "expense" as const,
      icon: catIconMap.get(e.category.toLowerCase()) ?? CATEGORY_ICONS[e.category as ExpenseCategory] ?? "📌",
    })),
    ...incomes.map((i) => ({
      id: i._id,
      amount: i.amount,
      label: i.source,
      date: i.date,
      type: "income" as const,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

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
                <span className="text-lg">{t.icon ?? "💰"}</span>
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
