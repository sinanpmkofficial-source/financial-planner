"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, startTransition, useCallback, useMemo } from "react";
import { getDashboardSummary } from "@/actions/stats";
import { getRecentExpenses } from "@/actions/expense";
import { getRecentIncomes } from "@/actions/income";
import { getBudgetsWithSpent } from "@/actions/budget";
import { getUserSettings } from "@/actions/settings";
import { getUnifiedData } from "@/actions/reports";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { XpCard } from "@/components/dashboard/xp-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { BudgetAlerts } from "@/components/dashboard/budget-alerts";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PageHeader } from "@/components/layout/header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { IncomeForm } from "@/components/income/income-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_ICONS, type ExpenseCategory } from "@/constants";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import type { DashboardSummary, Expense, Income, BudgetWithSpent } from "@/types";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

// Custom tooltip for premium look
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-xl px-3 py-2.5 shadow-md text-xs">
        <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
        {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function DashboardClient() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  // Decoupled loading states
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);

  const [graphPeriod, setGraphPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);

  const periodMetrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const item of chartData) {
      totalIncome += item.income || 0;
      totalExpenses += item.expenses || 0;
    }
    return { totalIncome, totalExpenses };
  }, [chartData]);

  const budgetSummary = useMemo(() => {
    const totalLimit = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalLeft = Math.max(0, totalLimit - totalSpent);
    const percentageLeft = totalLimit > 0 ? Math.round((totalLeft / totalLimit) * 100) : 0;
    const percentageSpent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    return { totalLimit, totalSpent, totalLeft, percentageLeft, percentageSpent };
  }, [budgets]);

  const fetchData = useCallback(async () => {
    // Fetch Summary independently
    setSummaryLoading(true);
    getDashboardSummary(undefined, undefined, new Date().getTimezoneOffset())
      .then((s) => {
        setSummary(s);
        setSummaryLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard summary load error", err);
        setSummaryLoading(false);
      });

    // Fetch Transactions (expenses & incomes) independently
    setTransactionsLoading(true);
    Promise.all([getRecentExpenses(5), getRecentIncomes(5)])
      .then(([e, i]) => {
        setExpenses(e);
        setIncomes(i);
        setTransactionsLoading(false);
      })
      .catch((err) => {
        console.error("Transactions load error", err);
        setTransactionsLoading(false);
      });

    // Fetch Budgets independently
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    setBudgetsLoading(true);
    getBudgetsWithSpent(currentMonth, currentYear)
      .then((b) => {
        setBudgets(b);
        setBudgetsLoading(false);
      })
      .catch((err) => {
        console.error("Budgets load error", err);
        setBudgetsLoading(false);
      });

    // Fetch User Settings independently
    setSettingsLoading(true);
    getUserSettings()
      .then((setts) => {
        setSettings(setts);
        setSettingsLoading(false);
      })
      .catch((err) => {
        console.error("Settings load error", err);
        setSettingsLoading(false);
      });
  }, []);

  const fetchTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const now = new Date();
      let start: Date;
      let end: Date;

      if (graphPeriod === "daily") {
        start = startOfDay(now);
        end = endOfDay(now);
      } else if (graphPeriod === "weekly") {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
      } else {
        start = startOfMonth(now);
        end = endOfMonth(now);
      }

      const data = await getUnifiedData(start, end, undefined, new Date().getTimezoneOffset());

      // Merge trends for Composed Chart
      const merged = data.expenseTrend.map((item, idx) => ({
        label: item.label,
        expenses: item.value,
        income: data.incomeTrend[idx]?.value ?? 0,
      }));
      setChartData(merged);
    } catch (err) {
      console.error("Dashboard trend load error", err);
    } finally {
      setTrendLoading(false);
    }
  }, [graphPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  const showGamification = settings?.showGamification !== false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        showMonthPicker={false}
        action={
          <QuickActions
            onAddExpense={() => setExpenseFormOpen(true)}
            onAddIncome={() => setIncomeFormOpen(true)}
            disabled={summaryLoading}
          />
        }
      />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Spent Today"
          value={summaryLoading || !summary ? "..." : formatCurrency(summary.todayExpenses ?? 0)}
          icon={TrendingDown}
          variant="danger"
          index="01"
          trend={
            summaryLoading || !summary
              ? "..."
              : (() => {
                  const now = new Date();
                  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                  const dailyLimit = budgetSummary.totalLimit / totalDays;
                  if (dailyLimit > 0) {
                    const diff = (summary.todayExpenses ?? 0) - dailyLimit;
                    return diff > 0 
                      ? `${formatCurrency(Math.round(diff))} over daily limit`
                      : `${formatCurrency(Math.round(Math.abs(diff)))} under daily limit`;
                  }
                  return "No budget configured";
                })()
          }
        />
        <StatCard
          label="Monthly Spend"
          value={summaryLoading || !summary ? "..." : formatCurrency(summary.monthlyExpenses ?? 0)}
          icon={TrendingDown}
          variant="warning"
          index="02"
          trend={
            summaryLoading || !summary
              ? "..."
              : budgetSummary.totalLimit > 0
              ? `${Math.round((summary.monthlyExpenses / budgetSummary.totalLimit) * 100)}% of total budget`
              : "No budget configured"
          }
        />
        <StatCard
          label="Remaining Budget"
          value={summaryLoading || !summary ? "..." : formatCurrency(budgetSummary.totalLeft)}
          icon={Target}
          variant="success"
          index="03"
          trend={
            summaryLoading || !summary
              ? "..."
              : budgetSummary.totalLimit > 0
              ? `${budgetSummary.percentageLeft}% remaining`
              : "No budget configured"
          }
        />
        <StatCard
          label="Net Savings (Month)"
          value={summaryLoading || !summary ? "..." : formatCurrency(summary.savings ?? 0)}
          icon={PiggyBank}
          variant="default"
          index="04"
          trend={
            summaryLoading || !summary
              ? "..."
              : (summary.savings ?? 0) >= 0
              ? "Positive cash flow"
              : "Negative cash flow"
          }
        />
      </div>

      {/* Top Section: Cash Flow Chart & Net Wealth Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Composed Cash Flow Chart */}
        <Card className="lg:col-span-2 border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Cash Flow</CardTitle>
                <CardDescription>
                  {graphPeriod === "daily"
                    ? "Today's hourly comparison"
                    : graphPeriod === "weekly"
                    ? "This week's daily comparison"
                    : "This month's daily comparison"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3.5">
                {/* Period Selector Tabs/Buttons */}
                <div className="flex rounded-lg bg-muted p-0.5 text-xs mr-2 border border-border/40">
                  <button
                    onClick={() => setGraphPeriod("daily")}
                    className={cn(
                      "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                      graphPeriod === "daily" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setGraphPeriod("weekly")}
                    className={cn(
                      "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                      graphPeriod === "weekly" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setGraphPeriod("monthly")}
                    className={cn(
                      "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                      graphPeriod === "monthly" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Month
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Income</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground">Expenses</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 gap-4 px-2 pb-4 border-b border-border/40 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Period Income
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {trendLoading ? (
                      <span className="inline-block h-5 w-20 bg-muted animate-pulse rounded-sm" />
                    ) : (
                      formatCurrency(periodMetrics.totalIncome)
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-500">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Period Expenses
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {trendLoading ? (
                      <span className="inline-block h-5 w-20 bg-muted animate-pulse rounded-sm" />
                    ) : (
                      formatCurrency(periodMetrics.totalExpenses)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-[260px] w-full relative">
              {trendLoading && (
                <div className="absolute inset-0 bg-card/50 flex items-center justify-center z-10 rounded-2xl">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.75 0.15 140)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="oklch(0.75 0.15 140)" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.60 0.18 25)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="oklch(0.60 0.18 25)" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    name="Income"
                    type="monotone"
                    dataKey="income"
                    stroke="oklch(0.65 0.15 140)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorInc)"
                  />
                  <Area
                    name="Expenses"
                    type="monotone"
                    dataKey="expenses"
                    stroke="oklch(0.60 0.18 25)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Consolidated Hero Net Cash Card */}
        <div
          className={cn(
            "relative overflow-hidden border rounded-2xl bg-card transition-all duration-300 flex flex-col justify-between",
            "shadow-[4px_4px_0px_var(--foreground)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.85)] border-foreground/30",
            "md:shadow-none md:border-foreground/15 md:hover:border-foreground/30 md:hover:shadow-[4px_4px_0px_var(--foreground)] md:dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]"
          )}
        >
          {/* Top Section */}
          <div className="flex items-center justify-between pb-3.5 px-6 pt-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/80 border border-foreground/10 px-1.5 py-0.5 rounded-md">
                OVERVIEW
              </span>
              <h3 className="text-base font-semibold text-foreground">Financial Summary</h3>
            </div>
            <div className="p-2 rounded-xl bg-muted/65 border border-foreground/5 text-foreground">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          {/* Ticket Cut / Dashed Line Separator */}
          <div className="relative flex items-center w-full">
            {/* Left Notch */}
            <div className="absolute left-[-8px] w-4 h-4 rounded-full bg-background border-r border-foreground/15 z-10" />
            {/* Dashed Line */}
            <div className="w-full border-t border-dashed border-foreground/15" />
            {/* Right Notch */}
            <div className="absolute right-[-8px] w-4 h-4 rounded-full bg-background border-l border-foreground/15 z-10" />
          </div>

          {/* Bottom Section */}
          <div className="p-6 flex-1 flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available Balance
              </p>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-foreground">
                {summaryLoading || !summary ? (
                  <span className="inline-block h-9 w-40 bg-muted animate-pulse rounded-md mt-1" />
                ) : (
                  formatCurrency(summary.currentBalance)
                )}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/60 text-center">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Today
                </span>
                {summaryLoading || !summary ? (
                  <div className="space-y-1 py-1">
                    <div className="h-3 w-12 bg-muted animate-pulse rounded-sm mx-auto" />
                    <div className="h-2.5 w-10 bg-muted animate-pulse rounded-sm mx-auto" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">
                      +{formatCurrency(summary.todayIncome ?? 0)}
                    </p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-500">
                      -{formatCurrency(summary.todayExpenses ?? 0)}
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-1 border-x border-border/60 px-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  This Week
                </span>
                {summaryLoading || !summary ? (
                  <div className="space-y-1 py-1">
                    <div className="h-3 w-12 bg-muted animate-pulse rounded-sm mx-auto" />
                    <div className="h-2.5 w-10 bg-muted animate-pulse rounded-sm mx-auto" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">
                      +{formatCurrency(summary.weekIncome ?? 0)}
                    </p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-500">
                      -{formatCurrency(summary.weekExpenses ?? 0)}
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  This Month
                </span>
                {summaryLoading || !summary ? (
                  <div className="space-y-1 py-1">
                    <div className="h-3 w-12 bg-muted animate-pulse rounded-sm mx-auto" />
                    <div className="h-2.5 w-10 bg-muted animate-pulse rounded-sm mx-auto" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">
                      +{formatCurrency(summary.monthlyIncome ?? 0)}
                    </p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-500">
                      -{formatCurrency(summary.monthlyExpenses ?? 0)}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-foreground/15 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <PiggyBank className="w-3.5 h-3.5 text-foreground" />
                Saved this Month
              </span>
              <span className="font-bold text-foreground">
                {summaryLoading || !summary ? (
                  <span className="inline-block h-3.5 w-16 bg-muted animate-pulse rounded-sm" />
                ) : (
                  formatCurrency(summary.savings)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row: Credit/Debt, Budget, and Gamification */}
      <div className={cn("grid gap-6", showGamification ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {/* Budget Status Card */}
        <div
          className={cn(
            "relative overflow-hidden border rounded-2xl bg-card transition-all duration-300 flex flex-col justify-between",
            "shadow-[4px_4px_0px_var(--foreground)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.85)] border-foreground/30",
            "md:shadow-none md:border-foreground/15 md:hover:border-foreground/30 md:hover:shadow-[4px_4px_0px_var(--foreground)] md:dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]"
          )}
        >
          {/* Top Section */}
          <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/80 border border-foreground/10 px-1.5 py-0.5 rounded-md">
                01
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Budgets
              </span>
            </div>
            <div className="p-2 rounded-xl bg-muted/65 border border-foreground/5 text-foreground">
              <Target className="w-4 h-4" />
            </div>
          </div>

          {/* Ticket Cut / Dashed Line Separator */}
          <div className="relative flex items-center w-full">
            {/* Left Notch */}
            <div className="absolute left-[-8px] w-4 h-4 rounded-full bg-background border-r border-foreground/15 z-10" />
            {/* Dashed Line */}
            <div className="w-full border-t border-dashed border-foreground/15" />
            {/* Right Notch */}
            <div className="absolute right-[-8px] w-4 h-4 rounded-full bg-background border-l border-foreground/15 z-10" />
          </div>

          {/* Bottom Section */}
          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
            {budgetsLoading ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded-sm" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded-sm" />
                  </div>
                  <div className="h-1.5 bg-muted animate-pulse rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded-sm" />
                    <div className="h-3 w-14 bg-muted animate-pulse rounded-sm" />
                  </div>
                  <div className="h-1.5 bg-muted animate-pulse rounded-full" />
                </div>
              </div>
            ) : budgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center gap-1.5">
                <p className="text-xs text-muted-foreground font-medium">
                  No budgets configured for this month.
                </p>
                <a
                  href="/budgets"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Configure Budgets <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Total Left Summary */}
                <div className="pb-3 border-b border-border/40">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Budget Left
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      {formatCurrency(budgetSummary.totalLeft)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      / {formatCurrency(budgetSummary.totalLimit)}
                    </span>
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded-md ml-auto",
                      budgetSummary.percentageLeft > 20
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
                        : budgetSummary.percentageLeft > 0
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-500"
                    )}>
                      {budgetSummary.percentageLeft}% left
                    </span>
                  </div>
                  <Progress 
                    value={budgetSummary.percentageSpent} 
                    className={cn(
                      "h-1.5 bg-muted mt-2",
                      budgetSummary.percentageSpent >= 100 && "[&>div]:bg-rose-500",
                      budgetSummary.percentageSpent >= 80 && budgetSummary.percentageSpent < 100 && "[&>div]:bg-amber-500",
                      budgetSummary.percentageSpent < 80 && "[&>div]:bg-emerald-500"
                    )}
                  />
                </div>

                {/* Individual Category Budgets */}
                <div className="space-y-3.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                  {budgets.map((b) => {
                    const percentage = Math.min(b.percentage, 100);
                    const isWarning = b.percentage >= 80 && b.percentage < 100;
                    const isDanger = b.percentage >= 100;
                    return (
                      <div key={b._id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <span className="text-sm">
                              {CATEGORY_ICONS[b.category as ExpenseCategory] || "📌"}
                            </span>
                            <span>{b.category}</span>
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            <span className="font-semibold text-foreground">{formatCurrency(b.spent)}</span>
                            {" / "}
                            <span>{formatCurrency(b.amount)}</span>
                          </span>
                        </div>
                        <div className="relative pt-1">
                          <Progress
                            value={percentage}
                            className={cn(
                              "h-1.5 bg-muted",
                              isDanger && "[&>div]:bg-rose-500",
                              isWarning && "[&>div]:bg-amber-500",
                              !isDanger && !isWarning && "[&>div]:bg-emerald-500"
                            )}
                          />
                          <span
                            className={cn(
                              "absolute right-0 top-[-10px] text-[9px] font-bold font-mono",
                              isDanger
                                ? "text-rose-600 dark:text-rose-400"
                                : isWarning
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {b.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Credit & Debt Card */}
        <div
          className={cn(
            "relative overflow-hidden border rounded-2xl bg-card transition-all duration-300 flex flex-col justify-between",
            "shadow-[4px_4px_0px_var(--foreground)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.85)] border-foreground/30",
            "md:shadow-none md:border-foreground/15 md:hover:border-foreground/30 md:hover:shadow-[4px_4px_0px_var(--foreground)] md:dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]"
          )}
        >
          {/* Top Section */}
          <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/80 border border-foreground/10 px-1.5 py-0.5 rounded-md">
                02
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Credit & Debts
              </span>
            </div>
            <div className="p-2 rounded-xl bg-muted/65 border border-foreground/5 text-foreground">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Ticket Cut / Dashed Line Separator */}
          <div className="relative flex items-center w-full">
            {/* Left Notch */}
            <div className="absolute left-[-8px] w-4 h-4 rounded-full bg-background border-r border-foreground/15 z-10" />
            {/* Dashed Line */}
            <div className="w-full border-t border-dashed border-foreground/15" />
            {/* Right Notch */}
            <div className="absolute right-[-8px] w-4 h-4 rounded-full bg-background border-l border-foreground/15 z-10" />
          </div>

          {/* Bottom Section */}
          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
            {summaryLoading || !summary ? (
              <>
                <div>
                  <div className="h-6 w-32 bg-muted animate-pulse rounded-md" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 bg-muted animate-pulse rounded-sm" />
                      <div className="h-3 w-12 bg-muted animate-pulse rounded-sm" />
                    </div>
                    <div className="h-1.5 bg-muted animate-pulse rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 bg-muted animate-pulse rounded-sm" />
                      <div className="h-3 w-12 bg-muted animate-pulse rounded-sm" />
                    </div>
                    <div className="h-1.5 bg-muted animate-pulse rounded-full" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h4 className="text-xl font-bold text-foreground">
                    Net Owed: {formatCurrency(summary.totalLent - summary.totalBorrowed)}
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-foreground" />
                        Borrowed (I owe)
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(summary.totalBorrowed)}</span>
                    </div>
                    <Progress value={summary.totalBorrowed > 0 ? (summary.totalBorrowed / (summary.totalBorrowed + summary.totalLent || 1)) * 100 : 0} className="h-1.5 bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <ArrowUpRight className="w-3.5 h-3.5 text-foreground" />
                        Lent (They owe me)
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(summary.totalLent)}</span>
                    </div>
                    <Progress value={summary.totalLent > 0 ? (summary.totalLent / (summary.totalBorrowed + summary.totalLent || 1)) * 100 : 0} className="h-1.5 bg-muted" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Level & XP Card */}
        {showGamification && <XpCard stats={summary?.stats} loading={summaryLoading} />}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentTransactions expenses={expenses} incomes={incomes} categories={settings?.categories} loading={transactionsLoading} />
        <BudgetAlerts budgets={budgets} loading={budgetsLoading} />
      </div>

      <ExpenseForm
        open={expenseFormOpen}
        onOpenChange={setExpenseFormOpen}
        onSuccess={fetchData}
      />
      <IncomeForm
        open={incomeFormOpen}
        onOpenChange={setIncomeFormOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
