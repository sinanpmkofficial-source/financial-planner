"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, startTransition, useCallback } from "react";
import { getDashboardSummary } from "@/actions/stats";
import { getRecentExpenses } from "@/actions/expense";
import { getRecentIncomes } from "@/actions/income";
import { getBudgetsWithSpent } from "@/actions/budget";
import { getUserSettings } from "@/actions/settings";
import { getExpenseTrend, getIncomeTrend } from "@/actions/reports";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { XpCard } from "@/components/dashboard/xp-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { BudgetAlerts } from "@/components/dashboard/budget-alerts";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PageHeader } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { DashboardSummary, Expense, Income, BudgetWithSpent } from "@/types";

// Custom tooltip for premium look
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const formattedLabel = typeof label === 'number' ? `Day ${label}` : label;
    return (
      <div className="bg-popover border border-border rounded-xl px-3 py-2.5 shadow-md text-xs">
        <p className="text-muted-foreground mb-1.5 font-medium">{formattedLabel}</p>
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
  const { selectedMonth, selectedYear } = useUIStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [graphPeriod, setGraphPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [chartLoading, setChartLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e, i, b, setts] = await Promise.all([
        getDashboardSummary(selectedMonth, selectedYear),
        getRecentExpenses(5),
        getRecentIncomes(5),
        getBudgetsWithSpent(selectedMonth, selectedYear),
        getUserSettings(),
      ]);
      
      setSummary(s);
      setExpenses(e);
      setIncomes(i);
      setBudgets(b);
      setSettings(setts);
    } catch (err) {
      console.error("Dashboard data load error", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchTrendData = useCallback(async () => {
    setChartLoading(true);
    try {
      const [et, it] = await Promise.all([
        getExpenseTrend(selectedMonth, selectedYear, undefined, graphPeriod),
        getIncomeTrend(selectedMonth, selectedYear, graphPeriod),
      ]);

      const merged = et.map((item, idx) => ({
        label: item.label,
        expenses: item.value,
        income: it[idx]?.value ?? 0,
      }));
      setChartData(merged);
    } catch (err) {
      console.error("Dashboard trend load error", err);
    } finally {
      setChartLoading(false);
    }
  }, [selectedMonth, selectedYear, graphPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchTrendData();
  }, [fetchTrendData]);

  if (loading || !summary) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" showMonthPicker />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 h-[340px] rounded-2xl bg-muted/65 animate-pulse" />
          <div className="h-[340px] rounded-2xl bg-muted/65 animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-32 rounded-2xl bg-muted/65 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const showGamification = settings?.showGamification !== false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Dashboard" showMonthPicker />
        <QuickActions />
      </div>

      {/* Top Section: Cash Flow Chart & Net Wealth Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Composed Cash Flow Chart */}
        <Card className="lg:col-span-2 border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Cash Flow</CardTitle>
                <CardDescription>Comparison of income and expenses</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* Legend */}
                <div className="flex items-center gap-3.5 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Income</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground">Expenses</span>
                  </div>
                </div>

                {/* Period Selector Tabs */}
                <Tabs
                  value={graphPeriod}
                  onValueChange={(v) => setGraphPeriod(v as "weekly" | "monthly" | "yearly")}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="bg-muted/50 p-0.5 h-8 grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
                    <TabsTrigger value="weekly" className="text-xs h-7 px-2.5">Week</TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs h-7 px-2.5">Month</TabsTrigger>
                    <TabsTrigger value="yearly" className="text-xs h-7 px-2.5">Year</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent className={cn("pt-4 transition-opacity duration-200", chartLoading && "opacity-55")}>
            <div className="h-[260px] w-full">
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
            "relative overflow-hidden border border-foreground/15 rounded-2xl bg-card transition-all duration-300",
            "hover:border-foreground/30 hover:shadow-[4px_4px_0px_var(--foreground)] dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]",
            "flex flex-col justify-between"
          )}
        >
          {/* Top Section */}
          <div className="flex items-center justify-between pb-3.5 px-6 pt-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/80 border border-foreground/10 px-1.5 py-0.5 rounded-md">
                HERO
              </span>
              <h3 className="text-base font-semibold text-foreground">Net Cash Position</h3>
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
                {formatCurrency(summary.currentBalance)}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-foreground" />
                  <span>Total In</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(summary.monthlyIncome)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <TrendingDown className="w-3.5 h-3.5 text-foreground" />
                  <span>Total Out</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(summary.monthlyExpenses)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-foreground/15 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <PiggyBank className="w-3.5 h-3.5 text-foreground" />
                Saved this Month
              </span>
              <span className="font-bold text-foreground">
                {formatCurrency(summary.savings)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row: Credit/Debt, Budget, and Gamification */}
      <div className={cn("grid gap-6", showGamification ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {/* Credit & Debt Card */}
        <div
          className={cn(
            "relative overflow-hidden border border-foreground/15 rounded-2xl bg-card transition-all duration-300",
            "hover:border-foreground/30 hover:shadow-[4px_4px_0px_var(--foreground)] dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]",
            "flex flex-col justify-between"
          )}
        >
          {/* Top Section */}
          <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/80 border border-foreground/10 px-1.5 py-0.5 rounded-md">
                01
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
          </div>
        </div>

        {/* Budget Status Card */}
        <div
          className={cn(
            "relative overflow-hidden border border-foreground/15 rounded-2xl bg-card transition-all duration-300",
            "hover:border-foreground/30 hover:shadow-[4px_4px_0px_var(--foreground)] dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]",
            "flex flex-col justify-between"
          )}
        >
          {/* Top Section */}
          <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/80 border border-foreground/10 px-1.5 py-0.5 rounded-md">
                02
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
            <div>
              <h4 className="text-xl font-bold text-foreground">
                {summary.budgetUsedPercentage}% Consumed
              </h4>
            </div>
            <div className="space-y-2">
              <Progress
                value={summary.budgetUsedPercentage}
                className="h-2 bg-muted"
              />
              <p className="text-xs text-muted-foreground font-medium">
                {summary.budgetUsedPercentage > 90
                  ? "Careful! You're approaching your overall budget limit."
                  : "Stretching well. Keep tracking your daily updates."}
              </p>
            </div>
          </div>
        </div>

        {/* Level & XP Card */}
        {showGamification && <XpCard stats={summary.stats} />}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentTransactions expenses={expenses} incomes={incomes} categories={settings?.categories} />
        <BudgetAlerts budgets={budgets} />
      </div>
    </div>
  );
}
