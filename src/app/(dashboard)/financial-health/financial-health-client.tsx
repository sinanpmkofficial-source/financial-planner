"use client";

import { useEffect, useState, useCallback } from "react";
import { getFinancialHealthData } from "@/actions/financial-health";
import { computeFinancialHealth } from "@/lib/finance";
import { CategoryBreakdown } from "@/components/shared/category-breakdown";
import { formatCurrency } from "@/lib/format";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Sparkles,
  PiggyBank,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS } from "@/constants";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 90, damping: 14 },
  },
} as const;

interface FinancialHealthData {
  totalIncome: number;
  totalNeeds: number;
  totalWants: number;
  totalInvestments: number;
  totalUnnecessary: number;
  totalGoals: number;
  totalSavings: number;
  rentExpense: number;
  totalLiquidCash: number;
  totalBorrowedPending: number;
}

const toneClasses = {
  rose: "text-rose-500 bg-rose-500/5 border-rose-500/15",
  amber: "text-amber-500 bg-amber-500/5 border-amber-500/15",
  blue: "text-blue-500 bg-blue-500/5 border-blue-500/15",
} as const;

type Tone = keyof typeof toneClasses;

export function FinancialHealthClient() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<FinancialHealthData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const hData = await getFinancialHealthData(selectedMonth, selectedYear);
      setHealthData(hData);
    } catch {
      toast.error("Failed to load financial health data");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const monthPicker = (
    <div className="flex items-center gap-2">
      <Select value={String(selectedMonth)} onValueChange={(val) => val && setSelectedMonth(Number(val))}>
        <SelectTrigger className="h-9 w-[110px] text-xs bg-background rounded-xl border-border/50">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {MONTHS.map((m, idx) => (
            <SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(selectedYear)} onValueChange={(val) => val && setSelectedYear(Number(val))}>
        <SelectTrigger className="h-9 w-[80px] text-xs bg-background rounded-xl border-border/50">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (loading || !healthData) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financial Health" description="Analyzing your finances..." action={monthPicker} />
        <div className="h-64 bg-muted/20 animate-pulse rounded-2xl border border-border/10" />
      </div>
    );
  }

  const {
    totalIncome,
    totalNeeds,
    totalWants,
    totalInvestments,
    totalUnnecessary,
    totalGoals,
    totalSavings,
  } = healthData;
  const emptyGuard = totalIncome <= 0;

  const purposeData = [
    { category: "Needs", amount: totalNeeds, color: "hsl(217, 91%, 60%)" },
    { category: "Wants", amount: totalWants, color: "hsl(43, 90%, 50%)" },
    { category: "Investments", amount: totalInvestments, color: "hsl(142, 72%, 45%)" },
    { category: "Wasted", amount: totalUnnecessary, color: "hsl(0, 75%, 58%)" },
  ];

  const {
    needsPct,
    wantsPct,
    savingsPct,
    targetNeeds,
    targetWants,
    targetSavings,
    emergencyTarget,
    emergencyMonthsCovered,
    dtiRatio,
    finalScore,
    verdict,
    tone,
  } = computeFinancialHealth(healthData);

  const wantsActual = totalWants + totalUnnecessary;
  const savingsActual = totalSavings + totalGoals;

  const scoreColor = {
    excellent: "text-emerald-500",
    good: "text-amber-500",
    attention: "text-rose-500",
    none: "text-muted-foreground",
  }[tone];
  const scoreStroke = {
    excellent: "stroke-emerald-500",
    good: "stroke-amber-500",
    attention: "stroke-rose-500",
    none: "stroke-muted-foreground",
  }[tone];
  const verdictBadge = {
    excellent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    good: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    attention: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    none: "text-muted-foreground bg-muted border-border/50",
  }[tone];

  // The three 50/30/20 buckets, each with its deviation and a plain "how to reach" line.
  const buckets = [
    {
      label: "Needs",
      target: 50,
      pct: needsPct,
      amount: totalNeeds,
      bad: needsPct > 50,
      reach: needsPct > 50
        ? `Trim ${formatCurrency(totalNeeds - targetNeeds)} from essentials to reach 50%`
        : `On track — ${formatCurrency(targetNeeds - totalNeeds)} of room left`,
    },
    {
      label: "Wants",
      target: 30,
      pct: wantsPct,
      amount: wantsActual,
      bad: wantsPct > 30,
      reach: wantsPct > 30
        ? `Cut ${formatCurrency(wantsActual - targetWants)} of lifestyle spending to reach 30%`
        : `Within budget — ${formatCurrency(targetWants - wantsActual)} to spare`,
    },
    {
      label: "Savings & Investments",
      target: 20,
      pct: savingsPct,
      amount: savingsActual,
      bad: savingsPct < 20,
      reach: savingsPct < 20
        ? `Set aside ${formatCurrency(targetSavings - savingsActual)} more to reach 20%`
        : `Great — ${formatCurrency(savingsActual - targetSavings)} above target`,
    },
  ];

  // One paired source of truth so "what went wrong" and "what to do" stay in sync.
  const issues: { wrong: string; action: string; icon: typeof AlertCircle; tone: Tone }[] = [];
  if (totalIncome > 0) {
    if (needsPct > 50) issues.push({
      icon: TrendingDown, tone: "rose",
      wrong: `Needs are ${needsPct.toFixed(0)}% of income — ${formatCurrency(totalNeeds - targetNeeds)} over the 50% cap.`,
      action: `Trim ${formatCurrency(totalNeeds - targetNeeds)} from essentials — revisit rent, bills and subscriptions.`,
    });
    if (wantsPct > 30) issues.push({
      icon: Sparkles, tone: "amber",
      wrong: `Wants are ${wantsPct.toFixed(0)}% of income — ${formatCurrency(wantsActual - targetWants)} over the 30% cap.`,
      action: `Cut ${formatCurrency(wantsActual - targetWants)} of lifestyle spends; try a 24-hour wait before non-essentials.`,
    });
    if (totalUnnecessary > 0) issues.push({
      icon: AlertCircle, tone: "rose",
      wrong: `You logged ${formatCurrency(totalUnnecessary)} as wasted / unnecessary spending.`,
      action: `Pause these leaks — it lifts your savings rate by ${((totalUnnecessary / totalIncome) * 100).toFixed(1)}%.`,
    });
    if (savingsPct < 20) issues.push({
      icon: PiggyBank, tone: "blue",
      wrong: `Savings rate is ${savingsPct.toFixed(0)}% — below the 20% target.`,
      action: `Auto-transfer ${formatCurrency(targetSavings - savingsActual)} to savings at the start of the month.`,
    });
    if (healthData.totalBorrowedPending > 0 && dtiRatio > 36) issues.push({
      icon: TrendingUp, tone: "rose",
      wrong: `Debt-to-income is ${dtiRatio.toFixed(0)}% — above the 36% ceiling.`,
      action: `Clear high-interest debt first and freeze new borrowing.`,
    });
    if (emergencyMonthsCovered < 6) issues.push({
      icon: ShieldCheck, tone: "amber",
      wrong: `Emergency buffer covers only ${emergencyMonthsCovered.toFixed(1)} months (aim for 6).`,
      action: `Build toward ${formatCurrency(emergencyTarget)} of liquid cash in a high-yield account.`,
    });
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-24">
      <PageHeader
        title="Financial Health"
        description="Your month at a glance, scored against the 50-30-20 rule"
        action={monthPicker}
      />

      {emptyGuard ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <Lightbulb className="w-8 h-8 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No income logged for this month</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add your income for {MONTHS[selectedMonth - 1]} {selectedYear} to generate your health score and breakdown.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Score + 50-30-20 breakdown */}
          <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-3">
            {/* Score */}
            <Card className="flex flex-col items-center justify-center p-6 text-center border-border/50 shadow-sm">
              <div className="relative flex items-center justify-center w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="68" className="stroke-muted" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="80" cy="80" r="68"
                    className={cn("transition-all duration-700", scoreStroke)}
                    strokeWidth="10" fill="transparent"
                    strokeDasharray={427}
                    strokeDashoffset={427 - (427 * finalScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={cn("text-5xl font-extrabold", scoreColor)}>{finalScore}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">/ 100</span>
                </div>
              </div>
              <div className={cn("px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider mt-5", verdictBadge)}>
                {verdict}
              </div>
            </Card>

            {/* 50-30-20 breakdown */}
            <Card className="md:col-span-2 border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-base font-semibold">50 / 30 / 20 Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {buckets.map((b) => (
                  <div key={b.label} className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-semibold text-foreground">
                        {b.label} <span className="text-muted-foreground font-normal">· target {b.target}%</span>
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {formatCurrency(b.amount)} · <span className={cn("font-semibold", b.bad ? "text-rose-500" : "text-emerald-500")}>{b.pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <Progress
                      value={Math.min(b.pct, 100)}
                      className={cn("h-2", b.bad ? "[&_[data-slot=progress-indicator]]:bg-rose-500" : "[&_[data-slot=progress-indicator]]:bg-emerald-500")}
                    />
                    <p className={cn("text-[11px]", b.bad ? "text-rose-500" : "text-muted-foreground")}>{b.reach}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Spending by purpose graph */}
          <motion.div variants={itemVariants}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-base font-semibold">Spending by Purpose</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <CategoryBreakdown data={purposeData} />
              </CardContent>
            </Card>
          </motion.div>

          {/* What went wrong + What to do */}
          <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2">
            {/* What went wrong */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-500" /> What went wrong
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-2.5">
                {issues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-semibold text-foreground">No red flags this month</p>
                    <p className="text-xs text-muted-foreground">Every 50-30-20 target checks out. Keep it up!</p>
                  </div>
                ) : (
                  issues.map((it, i) => (
                    <div key={i} className={cn("flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed", toneClasses[it.tone])}>
                      <it.icon className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="text-foreground/90">{it.wrong}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* What to do */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4.5 h-4.5 text-primary" /> What you should do
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-2.5">
                {issues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
                    <Sparkles className="w-8 h-8 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Stay the course</p>
                    <p className="text-xs text-muted-foreground">Keep saving 20%+ and your buffer growing.</p>
                  </div>
                ) : (
                  issues.map((it, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-card text-xs leading-relaxed">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-muted-foreground">{it.action}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
