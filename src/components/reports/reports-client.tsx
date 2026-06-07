"use client";

import { useEffect, useState, useCallback } from "react";
import { getReport } from "@/actions/reports";
import { getUserSettings } from "@/actions/settings";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/layout/header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import type { ReportData, ReportPeriod } from "@/types";
import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
} from "date-fns";

export function ReportsClient() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [date, setDate] = useState(new Date());
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Category filter state
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<{ name: string; icon: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReport(period, date, categoryFilter);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }, [period, date, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load custom categories for filter list
  useEffect(() => {
    getUserSettings().then((settings) => {
      setCategories(settings.categories || []);
    });
  }, []);

  const navigate = (direction: "prev" | "next") => {
    const fn =
      direction === "prev"
        ? { daily: subDays, weekly: subWeeks, monthly: subMonths, yearly: subYears }
        : { daily: addDays, weekly: addWeeks, monthly: addMonths, yearly: addYears };

    setDate((d) => fn[period](d, 1));
  };

  const isFiltered = categoryFilter !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Financial summaries across different periods"
      />

      {/* Period & Category Selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-card rounded-2xl border border-border/50 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Tabs */}
          <Tabs
            value={period}
            onValueChange={(v) => {
              setPeriod(v as ReportPeriod);
              setDate(new Date());
            }}
          >
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
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

        {/* Date Navigator */}
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/40 w-fit self-end sm:self-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("prev")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-semibold min-w-[130px] text-center text-foreground px-1">
            {report?.periodLabel ?? "..."}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("next")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Warning banner when filtering by category */}
      {isFiltered && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/10 bg-amber-50/50 dark:bg-amber-950/10 text-xs text-amber-600 dark:text-amber-500">
          <Info className="w-4 h-4 shrink-0" />
          <p>
            You are viewing the report specifically for <strong>{categoryFilter}</strong>.
            Income-related metrics (Income, Savings, Net Balance) are set to zero because income does not have an expense category.
          </p>
        </div>
      )}

      {/* Report Cards */}
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
          />
          <StatCard
            label="Expenses"
            value={formatCurrency(report.expenses)}
            icon={TrendingDown}
            variant="danger"
          />
          <StatCard
            label="Savings"
            value={formatCurrency(report.savings)}
            icon={PiggyBank}
            variant={isFiltered ? "default" : report.savings >= 0 ? "success" : "danger"}
          />
          <StatCard
            label="Net Balance"
            value={formatCurrency(report.netBalance)}
            icon={Wallet}
            variant={isFiltered ? "default" : report.netBalance >= 0 ? "success" : "danger"}
          />
        </div>
      ) : null}
    </div>
  );
}
