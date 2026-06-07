"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import {
  getExpenseTrend,
  getIncomeTrend,
  getSavingsTrend,
  getMonthlyComparison,
  getCategoryDistribution,
} from "@/actions/reports";
import { getUserSettings } from "@/actions/settings";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart,
  Bar,
  AreaChart,
  Area,
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
import { Info, BarChart2 } from "lucide-react";
import type {
  ChartDataPoint,
  MonthlyComparison,
  CategoryDistribution,
} from "@/types";

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-border/50 shadow-sm rounded-2xl bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">{children}</div>
      </CardContent>
    </Card>
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

export function AnalyticsClient() {
  const { selectedMonth, selectedYear, setYear } = useUIStore();
  const [expenseTrend, setExpenseTrend] = useState<ChartDataPoint[]>([]);
  const [incomeTrend, setIncomeTrend] = useState<ChartDataPoint[]>([]);
  const [savingsTrend, setSavingsTrend] = useState<ChartDataPoint[]>([]);
  const [comparison, setComparison] = useState<MonthlyComparison[]>([]);
  const [distribution, setDistribution] = useState<CategoryDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and period states
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [et, it, st, mc, cd] = await Promise.all([
        getExpenseTrend(selectedMonth, selectedYear, categoryFilter, period),
        getIncomeTrend(selectedMonth, selectedYear, period),
        getSavingsTrend(categoryFilter, period),
        getMonthlyComparison(categoryFilter, period),
        getCategoryDistribution(selectedMonth, selectedYear, period),
      ]);
      setExpenseTrend(et);
      setIncomeTrend(it);
      setSavingsTrend(st);
      setComparison(mc);
      setDistribution(cd);
    } catch (err) {
      console.error("Analytics load error", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, categoryFilter, period]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" showMonthPicker />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[360px] rounded-2xl bg-muted/65 animate-pulse border border-border/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Visual insights into your income and expenses"
        showMonthPicker={period === "monthly"} // Hide standard month picker in yearly view
      />

      {/* Toggles and Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-card rounded-2xl border border-border/50 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Toggle */}
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as "monthly" | "yearly")}
          >
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>

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

        {/* Local Year Select for Yearly View */}
        {period === "yearly" && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground">Active Year:</span>
            <Select value={String(selectedYear)} onValueChange={(val) => val && setYear(Number(val))}>
              <SelectTrigger className="h-9 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }, (_, i) => 2024 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expense Trend */}
        <ChartCard
          title={
            isFiltered
              ? `${categoryFilter} Expense Trend (${period === "monthly" ? "Daily" : "Monthly"})`
              : `Expense Trend (${period === "monthly" ? "Daily" : "Monthly"})`
          }
        >
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
        </ChartCard>

        {/* Income Trend */}
        <ChartCard title={`Income Trend (${period === "monthly" ? "Daily" : "Monthly"})`}>
          {isFiltered ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2 bg-muted/10 rounded-xl border border-dashed border-border">
              <Info className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Income trend is hidden when filtering by expense category
              </p>
            </div>
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

        {/* Savings Trend */}
        <ChartCard
          title={
            isFiltered
              ? `Savings after ${categoryFilter} (${period === "monthly" ? "6 Months" : "5 Years"})`
              : `Savings Trend (${period === "monthly" ? "6 Months" : "5 Years"})`
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={savingsTrend}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.16 260)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="oklch(0.65 0.16 260)" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
              <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                name="Savings"
                type="monotone"
                dataKey="value"
                stroke="oklch(0.65 0.16 260)"
                fill="url(#colorSavings)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly / Yearly Comparison */}
        <ChartCard
          title={
            isFiltered
              ? `Income vs ${categoryFilter} Expenses (${period === "monthly" ? "6 Months" : "5 Years"})`
              : `Income vs Expenses (${period === "monthly" ? "6 Months" : "5 Years"})`
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
              <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {!isFiltered && (
                <Bar
                  name="Income"
                  dataKey="income"
                  fill="oklch(0.65 0.15 140)"
                  radius={[4, 4, 0, 0]}
                />
              )}
              <Bar
                name={isFiltered ? `${categoryFilter} Expenses` : "Expenses"}
                dataKey="expenses"
                fill="oklch(0.60 0.18 25)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Distribution */}
        <ChartCard title={`Expense by Category (${period === "monthly" ? "Monthly" : "Yearly"})`}>
          {isFiltered ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2 bg-muted/10 rounded-xl border border-dashed border-border">
              <BarChart2 className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Distribution breakdown is only visible when viewing all categories
              </p>
            </div>
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
