"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useUIStore } from "@/stores/ui-store";
import { getDashboardSummary } from "@/actions/stats";
import { getRecentExpenses, getExpensesByCategory } from "@/actions/expense";
import { getRecentIncomes } from "@/actions/income";
import { getBudgetsWithSpent } from "@/actions/budget";
import { getUserSettings } from "@/actions/settings";
import { getUnifiedData } from "@/actions/reports";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/shared/count-up";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
const CategoryBreakdown = dynamic(
  () => import("@/components/shared/category-breakdown").then((m) => m.CategoryBreakdown),
  { ssr: false, loading: () => <div className="h-44 w-full bg-muted/20 animate-pulse rounded-xl" /> }
);
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { BudgetAlerts } from "@/components/dashboard/budget-alerts";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PageHeader } from "@/components/layout/header";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_ICONS, CATEGORY_COLORS, type ExpenseCategory } from "@/constants";
import { CategoryIcon } from "@/components/shared/category-icon";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  ArrowRight,
  AlertCircle,
  Repeat,
  CalendarClock,
  PieChart as PieChartIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getRecurringExpenses, confirmRecurringPayment } from "@/actions/recurring-expense";

import { StatCard } from "@/components/shared/stat-card";
import type { DashboardSummary, Expense, Income, BudgetWithSpent, RecurringExpense } from "@/types";

interface DashboardUserSettings {
  categories?: { name: string; icon: string; color: string }[];
  showGamification?: boolean;
  currency?: string;
}

interface DashboardChartData {
  label: string;
  expenses: number;
  income: number;
}
import {
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 90,
      damping: 14
    }
  }
} as const;


export function DashboardClient() {
  const { dashboardCache, updateDashboardCache } = useUIStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [settings, setSettings] = useState<DashboardUserSettings | null>(null);
  const [chartData, setChartData] = useState<DashboardChartData[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [categorySpend, setCategorySpend] = useState<{ category: string; amount: number }[]>([]);
  const [categorySpendLoading, setCategorySpendLoading] = useState(true);

  // Decoupled loading states
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);

  const [graphPeriod, setGraphPeriod] = useState<"weekly" | "monthly">("weekly");

  const [transactionFormOpen, setTransactionFormOpen] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load from cache on initial client mount
  useEffect(() => {
    if (dashboardCache) {
      if (dashboardCache.summary) {
        setSummary(dashboardCache.summary);
        setSummaryLoading(false);
      }
      if (dashboardCache.expenses && dashboardCache.expenses.length > 0) {
        setExpenses(dashboardCache.expenses);
      }
      if (dashboardCache.incomes && dashboardCache.incomes.length > 0) {
        setIncomes(dashboardCache.incomes);
      }
      if (dashboardCache.expenses && dashboardCache.incomes && (dashboardCache.expenses.length > 0 || dashboardCache.incomes.length > 0)) {
        setTransactionsLoading(false);
      }
      if (dashboardCache.budgets && dashboardCache.budgets.length > 0) {
        setBudgets(dashboardCache.budgets);
        setBudgetsLoading(false);
      }
      if (dashboardCache.settings) {
        setSettings(dashboardCache.settings);
      }
      if (dashboardCache.recurringExpenses && dashboardCache.recurringExpenses.length > 0) {
        setRecurringExpenses(dashboardCache.recurringExpenses);
      }
      if (dashboardCache.chartData && dashboardCache.chartData.length > 0) {
        setChartData(dashboardCache.chartData);
      }
      if (dashboardCache.categorySpend && dashboardCache.categorySpend.length > 0) {
        setCategorySpend(dashboardCache.categorySpend);
        setCategorySpendLoading(false);
      }
    }
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! ☀️";
    if (hour < 17) return "Good afternoon! 🌤️";
    return "Good evening! 🌙";
  }, []);

  const currentDateString = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, []);

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
    const totalLeft = budgets.reduce((sum, b) => sum + b.remaining, 0);
    const percentageLeft = totalLimit > 0 ? Math.round((totalLeft / totalLimit) * 100) : 0;
    const percentageSpent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    return { totalLimit, totalSpent, totalLeft, percentageLeft, percentageSpent };
  }, [budgets]);

  const catIconMap = useMemo(() => {
    const categories = settings?.categories || [];
    return new Map<string, string>(categories.map((c) => [c.name.toLowerCase(), c.icon]));
  }, [settings]);

  // Fallback palette for categories that have no configured colour
  const FALLBACK_PALETTE = [
    "hsl(217, 91%, 60%)", "hsl(142, 72%, 45%)", "hsl(25, 95%, 53%)",
    "hsl(325, 80%, 55%)", "hsl(43, 90%, 50%)", "hsl(271, 80%, 60%)",
    "hsl(190, 80%, 45%)", "hsl(0, 75%, 58%)",
  ];

  const categoryChartData = useMemo(() => {
    const colorMap = new Map<string, string>(
      (settings?.categories || []).map((c) => [c.name.toLowerCase(), c.color])
    );
    return categorySpend.map((c, i) => ({
      category: c.category,
      amount: c.amount,
      color:
        colorMap.get(c.category.toLowerCase()) ??
        CATEGORY_COLORS[c.category as ExpenseCategory] ??
        FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySpend, settings]);

  const fetchData = useCallback(async () => {
    // Only show loading spinner if we don't have cached data
    const currentCache = useUIStore.getState().dashboardCache;
    if (!currentCache.summary) setSummaryLoading(true);
    if (!currentCache.expenses || currentCache.expenses.length === 0) setTransactionsLoading(true);
    if (!currentCache.budgets || currentCache.budgets.length === 0) setBudgetsLoading(true);

    const timezoneOffset = new Date().getTimezoneOffset();

    // Fetch Summary independently
    getDashboardSummary(undefined, undefined, timezoneOffset)
      .then((s) => {
        setSummary(s);
        setSummaryLoading(false);
        updateDashboardCache({ summary: s });
      })
      .catch((err) => {
        console.error("Dashboard summary load error", err);
        setSummaryLoading(false);
      });

    // Fetch Transactions (expenses & incomes) independently
    Promise.all([getRecentExpenses(5), getRecentIncomes(5)])
      .then(([e, i]) => {
        setExpenses(e);
        setIncomes(i);
        setTransactionsLoading(false);
        updateDashboardCache({ expenses: e, incomes: i });
      })
      .catch((err) => {
        console.error("Transactions load error", err);
        setTransactionsLoading(false);
      });

    // Fetch Budgets independently
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    getBudgetsWithSpent(currentMonth, currentYear)
      .then((b) => {
        setBudgets(b);
        setBudgetsLoading(false);
        updateDashboardCache({ budgets: b });
      })
      .catch((err) => {
        console.error("Budgets load error", err);
        setBudgetsLoading(false);
      });

    // Fetch category-wise spend for the current month
    if (!currentCache.categorySpend || currentCache.categorySpend.length === 0) setCategorySpendLoading(true);
    getExpensesByCategory(currentMonth, currentYear)
      .then((cs) => {
        setCategorySpend(cs);
        setCategorySpendLoading(false);
        updateDashboardCache({ categorySpend: cs });
      })
      .catch((err) => {
        console.error("Category spend load error", err);
        setCategorySpendLoading(false);
      });

    // Fetch User Settings independently
    getUserSettings()
      .then((setts) => {
        setSettings(setts);
        updateDashboardCache({ settings: setts });
      })
      .catch((err) => {
        console.error("Settings load error", err);
      });

    // Fetch Recurring Expenses
    getRecurringExpenses()
      .then((recs) => {
        setRecurringExpenses(recs);
        updateDashboardCache({ recurringExpenses: recs });
      })
      .catch((err) => {
        console.error("Recurring load error", err);
      });
  }, [updateDashboardCache]);

  const fetchTrend = useCallback(async () => {
    const currentCache = useUIStore.getState().dashboardCache;
    if (!currentCache.chartData || currentCache.chartData.length === 0) setTrendLoading(true);
    try {
      const now = new Date();
      let start: Date;
      let end: Date;

      if (graphPeriod === "weekly") {
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
      updateDashboardCache({ chartData: merged });
    } catch (err) {
      console.error("Dashboard trend load error", err);
    } finally {
      setTrendLoading(false);
    }
  }, [graphPeriod, updateDashboardCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  const dueReminders = useMemo(() => {
    const today = new Date();
    return recurringExpenses.filter((item) => {
      if (!item.isActive) return false;
      const dueDate = new Date(item.nextDueDate);
      return dueDate <= today;
    });
  }, [recurringExpenses]);

  const upcomingUnbudgetedRecurringTotal = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const unbudgetedRecs = recurringExpenses.filter((item) => {
      if (!item.isActive) return false;

      const dueDate = new Date(item.nextDueDate);
      const isDueThisMonthOrOverdue =
        dueDate.getFullYear() < currentYear ||
        (dueDate.getFullYear() === currentYear && dueDate.getMonth() <= currentMonth);

      if (!isDueThisMonthOrOverdue) return false;

      const isBudgeted = budgets.some(
        (b) => b.category.toLowerCase() === item.category.toLowerCase()
      );
      return !isBudgeted;
    });

    return unbudgetedRecs.reduce((sum, item) => sum + item.amount, 0);
  }, [recurringExpenses, budgets]);

  const handleConfirmPayment = async (id: string) => {
    const toastId = toast.loading("Confirming and recording payment...");
    try {
      const res = await confirmRecurringPayment(id);
      if (res.success) {
        toast.success("Payment confirmed and logged as an expense", { id: toastId });
        fetchData();
      } else {
        toast.error(res.error || "Failed to confirm payment", { id: toastId });
      }
    } catch {
      toast.error("Failed to confirm payment", { id: toastId });
    }
  };

  const showGamification = false;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageHeader
        title={greeting}
        description={currentDateString}
        showMonthPicker={false}
        action={
          <div className="flex items-center gap-2">
            <QuickActions
              onRecordTransaction={() => setTransactionFormOpen(true)}
              disabled={summaryLoading}
            />
          </div>
        }
      />

      {/* Due Reminders Banner */}
      {dueReminders.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 mt-0.5 shrink-0">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Pending Bill Reminders</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {dueReminders.length} recurring {dueReminders.length === 1 ? "expense" : "expenses"} due for payment confirmation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none max-w-full md:max-w-md">
            {dueReminders.map((reminder) => (
              <div
                key={reminder._id}
                className="flex items-center gap-3 bg-card border border-border/80 px-3.5 py-2 rounded-xl text-xs shrink-0 shadow-xs hover:border-amber-500/30 transition-all"
              >
                <div>
                  <p className="font-bold text-foreground">
                    {reminder.category} • {formatCurrency(reminder.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    Due {new Date(reminder.nextDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-amber-500/20 text-amber-500 hover:bg-amber-500/10 cursor-pointer font-semibold px-2.5 rounded-lg text-[10px]"
                  onClick={() => handleConfirmPayment(reminder._id)}
                >
                  Confirm
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Compact Metrics Bar */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Available Balance */}
          <div className="px-5 py-4 flex flex-col gap-1 min-w-0 border border-border rounded-2xl bg-card shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Available Balance
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {summaryLoading || !summary ? (
                <span className="inline-block h-7 w-28 bg-muted animate-pulse rounded-md" />
              ) : (
                <CountUp value={summary.currentBalance} formatter={formatCurrency} />
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {summaryLoading || !summary ? "" : "All-time net balance"}
            </p>
          </div>

          {/* Safe to Spend */}
          <div className="px-5 py-4 flex flex-col gap-1 min-w-0 border border-border rounded-2xl bg-card shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Safe to Spend
            </p>
            <p className={cn(
              "text-xl sm:text-2xl font-extrabold tracking-tight",
              summaryLoading || budgetsLoading || !summary
                ? "text-muted-foreground"
                : (summary.savings ?? 0) - budgetSummary.totalLeft - upcomingUnbudgetedRecurringTotal >= 0
                ? "text-primary"
                : "text-rose-500"
            )}>
              {summaryLoading || budgetsLoading || !summary ? (
                <span className="inline-block h-7 w-28 bg-muted animate-pulse rounded-md" />
              ) : (
                <CountUp
                  value={(summary.savings ?? 0) - budgetSummary.totalLeft - upcomingUnbudgetedRecurringTotal}
                  formatter={formatCurrency}
                />
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {summaryLoading || budgetsLoading || !summary
                ? ""
                : (summary.savings ?? 0) - budgetSummary.totalLeft - upcomingUnbudgetedRecurringTotal >= 0
                ? "Unallocated surplus"
                : "Deficit — over budget"}
            </p>
          </div>

          {/* Spent this week */}
          <div className="px-5 py-4 flex flex-col gap-1 min-w-0 border border-border rounded-2xl bg-card shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Spent This Week
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-rose-500">
              {summaryLoading || !summary ? (
                <span className="inline-block h-7 w-28 bg-muted animate-pulse rounded-md" />
              ) : (
                <CountUp value={summary.weekExpenses ?? 0} formatter={formatCurrency} />
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {summaryLoading || !summary
                ? ""
                : `${formatCurrency(summary.todayExpenses ?? 0)} spent today`}
            </p>
          </div>

          {/* Income this month */}
          <div className="px-5 py-4 flex flex-col gap-1 min-w-0 border border-border rounded-2xl bg-card shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Income This Month
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-500">
              {summaryLoading || !summary ? (
                <span className="inline-block h-7 w-28 bg-muted animate-pulse rounded-md" />
              ) : (
                <CountUp value={summary.monthlyIncome ?? 0} formatter={formatCurrency} />
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {summaryLoading || !summary
                ? ""
                : (summary.monthlyIncome ?? 0) > 0
                ? `${Math.round(((summary.savings ?? 0) / summary.monthlyIncome) * 100)}% saved this month`
                : "No income logged yet"}
            </p>
          </div>
        </div>
      </motion.div>


      {/* Secondary Row: Credit/Debt and Budget */}
      <motion.div
        variants={itemVariants}
        className="grid gap-6 md:grid-cols-2"
      >
        {/* Budget Status Card */}
        <div
          className={cn(
            "relative overflow-hidden border border-border/60 rounded-2xl bg-card transition-all duration-300 flex flex-col justify-between",
            "shadow-[0_1px_3px_oklch(0_0_0/6%),0_1px_2px_oklch(0_0_0/4%)] hover:shadow-[0_4px_12px_oklch(0_0_0/8%)] hover:border-border",
            "dark:shadow-[0_1px_3px_oklch(0_0_0/30%)] dark:hover:shadow-[0_4px_14px_oklch(0_0_0/40%)]"
          )}
        >
          {/* Top Section */}
          <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-1.5 py-0.5 rounded-md">
                01
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Monthly Budgets
              </span>
            </div>
            <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground">
              <Target className="w-4 h-4" />
            </div>
          </div>

          {/* Thin Separator */}
          <div className="w-full border-t border-border/50 border-dashed" />

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
                      <CountUp value={budgetSummary.totalLeft} formatter={formatCurrency} />
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      / <CountUp value={budgetSummary.totalLimit} formatter={formatCurrency} />
                    </span>
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded-md ml-auto",
                      budgetSummary.percentageLeft > 20
                        ? "bg-primary/10 text-primary"
                        : budgetSummary.percentageLeft > 0
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-rose-500/10 text-rose-500"
                    )}>
                      <CountUp value={budgetSummary.percentageLeft} />% left
                    </span>
                  </div>
                  <Progress 
                    value={isMounted ? budgetSummary.percentageSpent : 0} 
                    className={cn(
                      "h-1.5 bg-muted mt-2",
                      budgetSummary.percentageSpent >= 100 && "[&_[data-slot=progress-indicator]]:bg-rose-500",
                      budgetSummary.percentageSpent >= 80 && budgetSummary.percentageSpent < 100 && "[&_[data-slot=progress-indicator]]:bg-amber-500",
                      budgetSummary.percentageSpent < 80 && "[&_[data-slot=progress-indicator]]:bg-primary/70"
                    )}
                  />
                </div>

                {/* Individual Category Budgets */}
                <div className="space-y-3.5 pr-1">
                  {budgets.map((b) => {
                    const percentage = Math.min(b.percentage, 100);
                    const isWarning = b.percentage >= 80 && b.percentage < 100;
                    const isDanger = b.percentage >= 100;
                    return (
                      <div key={b._id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <CategoryIcon
                              name={catIconMap.get(b.category.toLowerCase()) ?? CATEGORY_ICONS[b.category as ExpenseCategory] ?? "Tag"}
                              className="w-4 h-4 text-muted-foreground"
                            />
                            <span>{b.category}</span>
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            <span className="font-semibold text-foreground"><CountUp value={b.spent} formatter={formatCurrency} /></span>
                            {" / "}
                            <span><CountUp value={b.amount} formatter={formatCurrency} /></span>
                          </span>
                        </div>
                        <div className="relative pt-1">
                          <Progress
                            value={isMounted ? percentage : 0}
                            className={cn(
                              "h-1.5 bg-muted",
                              isDanger && "[&_[data-slot=progress-indicator]]:bg-rose-500",
                              isWarning && "[&_[data-slot=progress-indicator]]:bg-amber-500",
                              !isDanger && !isWarning && "[&_[data-slot=progress-indicator]]:bg-primary/70"
                            )}
                          />
                          <span
                            className={cn(
                              "absolute right-0 top-[-10px] text-[9px] font-bold font-mono",
                              isDanger
                                ? "text-rose-500"
                                : isWarning
                                ? "text-amber-500"
                                : "text-muted-foreground"
                            )}
                          >
                            <CountUp value={b.percentage} />%
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
            "relative overflow-hidden border border-border/60 rounded-2xl bg-card transition-all duration-300 flex flex-col justify-between",
            "shadow-[0_1px_3px_oklch(0_0_0/6%),0_1px_2px_oklch(0_0_0/4%)] hover:shadow-[0_4px_12px_oklch(0_0_0/8%)] hover:border-border",
            "dark:shadow-[0_1px_3px_oklch(0_0_0/30%)] dark:hover:shadow-[0_4px_14px_oklch(0_0_0/40%)]"
          )}
        >
          {/* Top Section */}
          <div className="flex items-center justify-between pb-3.5 px-5 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-1.5 py-0.5 rounded-md">
                02
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Credit & Debts
              </span>
            </div>
            <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Thin Separator */}
          <div className="w-full border-t border-border/50 border-dashed" />

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
                    Net Owed: <CountUp value={summary.totalLent - summary.totalBorrowed} formatter={formatCurrency} />
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-foreground" />
                        Borrowed (I owe)
                      </span>
                      <span className="font-bold text-foreground"><CountUp value={summary.totalBorrowed} formatter={formatCurrency} /></span>
                    </div>
                    <Progress value={isMounted ? (summary.totalBorrowed > 0 ? (summary.totalBorrowed / (summary.totalBorrowed + summary.totalLent || 1)) * 100 : 0) : 0} className="h-1.5 bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <ArrowUpRight className="w-3.5 h-3.5 text-foreground" />
                        Lent (They owe me)
                      </span>
                      <span className="font-bold text-foreground"><CountUp value={summary.totalLent} formatter={formatCurrency} /></span>
                    </div>
                    <Progress value={isMounted ? (summary.totalLent > 0 ? (summary.totalLent / (summary.totalBorrowed + summary.totalLent || 1)) * 100 : 0) : 0} className="h-1.5 bg-muted" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>


      </motion.div>

      {/* Recurring Expenses Card */}
      <motion.div variants={itemVariants}>
        <div className={cn(
          "relative overflow-hidden border border-border/60 rounded-2xl bg-card transition-all duration-300",
          "shadow-[0_1px_3px_oklch(0_0_0/30%)] hover:shadow-[0_4px_14px_oklch(0_0_0/40%)] hover:border-border"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-1.5 py-0.5 rounded-md">03</span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recurring Expenses</span>
            </div>
            <div className="flex items-center gap-2">
              {recurringExpenses.filter(r => r.isActive).length > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {formatCurrency(recurringExpenses.filter(r => r.isActive).reduce((s, r) => s + r.amount, 0))}/mo
                </span>
              )}
              <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground">
                <Repeat className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="w-full border-t border-border/50 border-dashed" />

          {/* List */}
          <div className="p-4">
            {recurringExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-1.5">
                <CalendarClock className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground font-medium">No recurring expenses set up.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recurringExpenses
                  .filter(r => r.isActive)
                  .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
                  .map((rec) => {
                    const due = new Date(rec.nextDueDate);
                    const today = new Date();
                    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = diffDays < 0;
                    const isDueSoon = !isOverdue && diffDays <= 3;
                    return (
                      <div
                        key={rec._id}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-all",
                          isOverdue
                            ? "border-rose-500/20 bg-rose-500/10"
                            : isDueSoon
                            ? "border-amber-500/20 bg-amber-500/10"
                            : "border-border bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              isOverdue ? "bg-rose-500" : isDueSoon ? "bg-amber-400" : "bg-primary/50"
                            )}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{rec.category}</p>
                            <p className={cn(
                              "text-[10px] font-medium",
                              isOverdue ? "text-rose-500" : isDueSoon ? "text-amber-500" : "text-muted-foreground"
                            )}>
                              {isOverdue
                                ? `Overdue by ${Math.abs(diffDays)}d`
                                : diffDays === 0
                                ? "Due today"
                                : `Due in ${diffDays}d`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-bold text-foreground">{formatCurrency(rec.amount)}</p>
                          <span className={cn(
                            "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                            "bg-muted text-muted-foreground"
                          )}>
                            {rec.frequency}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Spending by Category (doughnut) */}
      <motion.div variants={itemVariants}>
        <div className={cn(
          "relative overflow-hidden border border-border/60 rounded-2xl bg-card transition-all duration-300",
          "shadow-[0_1px_3px_oklch(0_0_0/30%)] hover:shadow-[0_4px_14px_oklch(0_0_0/40%)] hover:border-border"
        )}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-1.5 py-0.5 rounded-md">04</span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Spending by Category</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                This month
              </span>
              <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground">
                <PieChartIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="w-full border-t border-border/50 border-dashed" />
          <div className="p-5">
            {categorySpendLoading ? (
              <div className="h-44 w-full bg-muted/20 animate-pulse rounded-xl" />
            ) : (
              <CategoryBreakdown data={categoryChartData} />
            )}
          </div>
        </div>
      </motion.div>

      {/* Content Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        <RecentTransactions expenses={expenses} incomes={incomes} categories={settings?.categories} loading={transactionsLoading} />
        <BudgetAlerts budgets={budgets} loading={budgetsLoading} categories={settings?.categories} />
      </motion.div>

      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={setTransactionFormOpen}
        onSuccess={fetchData}
      />
    </motion.div>
  );
}
