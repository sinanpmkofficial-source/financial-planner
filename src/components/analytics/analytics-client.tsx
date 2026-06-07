"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getUnifiedData } from "@/actions/reports";
import { getUserSettings } from "@/actions/settings";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/layout/header";
import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Info,
  BarChart2,
} from "lucide-react";
import type {
  ChartDataPoint,
  CategoryDistribution,
  ReportData,
} from "@/types";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { DateRange } from "react-day-picker";

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-foreground/15 rounded-2xl bg-card transition-all duration-300",
        "hover:border-foreground/30 hover:shadow-[4px_4px_0px_var(--foreground)] dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.85)]",
        "flex flex-col justify-between"
      )}
    >
      <div className="pb-3.5 px-5 pt-5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>

      <div className="relative flex items-center w-full">
        <div className="absolute left-[-8px] w-4 h-4 rounded-full bg-background border-r border-foreground/15 z-10" />
        <div className="w-full border-t border-dashed border-foreground/15" />
        <div className="absolute right-[-8px] w-4 h-4 rounded-full bg-background border-l border-foreground/15 z-10" />
      </div>

      <div className="p-5">
        <div className="h-[280px] w-full">{children}</div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-xl px-3 py-2 shadow-md">
        <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
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

type PeriodPreset = 
  | "Today" 
  | "Yesterday" 
  | "Last 7 Days" 
  | "Last 30 Days" 
  | "This Month" 
  | "Last Month" 
  | "This Year" 
  | "Custom";

export function AnalyticsClient() {
  const [expenseTrend, setExpenseTrend] = useState<ChartDataPoint[]>([]);
  const [incomeTrend, setIncomeTrend] = useState<ChartDataPoint[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [distribution, setDistribution] = useState<CategoryDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and period states
  const [preset, setPreset] = useState<PeriodPreset>("This Month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case "Today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "Yesterday":
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case "Last 7 Days":
        return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      case "Last 30 Days":
        return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
      case "This Month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "Last Month":
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "This Year":
        return { from: startOfYear(now), to: endOfYear(now) };
      case "Custom":
        return customRange;
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  }, [preset, customRange]);

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true);
    try {
      const data = await getUnifiedData(dateRange.from, dateRange.to, categoryFilter);
      setReport(data.report);
      setExpenseTrend(data.expenseTrend);
      setIncomeTrend(data.incomeTrend);
      setDistribution(data.categoryDistribution);
    } catch (err) {
      console.error("Analytics load error", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load custom categories for filter list
  useEffect(() => {
    getUserSettings().then((settings) => {
      setCategories(settings.categories || []);
    });
  }, []);

  const isFiltered = categoryFilter !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        description={report?.periodLabel || "Loading report data..."}
      />

      {/* Toggles and Filter Bar */}
      <div className="flex flex-col gap-4 p-4 bg-card rounded-2xl border border-border/50 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Preset Select */}
          <Select value={preset} onValueChange={(val) => setPreset(val as PeriodPreset)}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Yesterday">Yesterday</SelectItem>
              <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
              <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="Last Month">Last Month</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
              <SelectItem value="Custom">📅 Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range Picker */}
          {preset === "Custom" && (
            <DateRangePicker 
              date={customRange} 
              setDate={setCustomRange} 
            />
          )}

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={(val) => val && setCategoryFilter(val)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📁 All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Warning banner when filtering by category */}
      {isFiltered && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/10 bg-amber-50/50 dark:bg-amber-950/10 text-xs text-amber-600 dark:text-amber-500">
          <Info className="w-4 h-4 shrink-0" />
          <p>
            You are viewing the report specifically for <strong>{categoryFilter}</strong>.
            Income-related metrics are hidden or set to zero.
          </p>
        </div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[120px] rounded-2xl bg-muted/60 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : report ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Income"
            value={formatCurrency(report.income)}
            icon={TrendingUp}
            variant={isFiltered ? "default" : "success"}
            index="01"
          />
          <StatCard
            label="Expenses"
            value={formatCurrency(report.expenses)}
            icon={TrendingDown}
            variant="danger"
            index="02"
          />
          <StatCard
            label="Savings"
            value={formatCurrency(report.savings)}
            icon={PiggyBank}
            variant={isFiltered ? "default" : report.savings >= 0 ? "success" : "danger"}
            index="03"
          />
          <StatCard
            label="Net Balance"
            value={formatCurrency(report.netBalance)}
            icon={Wallet}
            variant={isFiltered ? "default" : report.netBalance >= 0 ? "success" : "danger"}
            index="04"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expense Trend */}
        <ChartCard
          title={
            isFiltered
              ? `${categoryFilter} Expense Trend`
              : `Expense Trend`
          }
        >
          {loading ? (
             <div className="w-full h-full bg-muted/20 animate-pulse rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expenseTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
                <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  name="Expenses"
                  type="monotone"
                  dataKey="value"
                  stroke="oklch(0.60 0.18 25)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Income Trend */}
        <ChartCard title="Income Trend">
          {isFiltered ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2 bg-muted/10 rounded-xl border border-dashed border-border">
              <Info className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Income trend is hidden when filtering by expense category
              </p>
            </div>
          ) : loading ? (
            <div className="w-full h-full bg-muted/20 animate-pulse rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incomeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
                <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  name="Income"
                  type="monotone"
                  dataKey="value"
                  stroke="oklch(0.65 0.15 140)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Category Distribution */}
        <ChartCard title="Expense by Category">
          {isFiltered ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2 bg-muted/10 rounded-xl border border-dashed border-border">
              <BarChart2 className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Distribution breakdown is only visible when viewing all categories
              </p>
            </div>
          ) : loading ? (
            <div className="w-full h-full bg-muted/20 animate-pulse rounded-lg" />
          ) : distribution.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No expense data available for this selection
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="amount"
                  nameKey="category"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => (
                    <span className="text-xs text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
