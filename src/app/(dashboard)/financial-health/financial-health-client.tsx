"use client";

import { useEffect, useState, useCallback } from "react";
import { getFinancialHealthData } from "@/actions/financial-health";
import { formatCurrency } from "@/lib/format";
import { CountUp } from "@/components/shared/count-up";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
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

import { PageHeader } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertCircle, Sparkles, TrendingUp, TrendingDown, PiggyBank, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS } from "@/constants";

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

export function FinancialHealthClient() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<FinancialHealthData | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  if (loading || !healthData) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Financial Health" 
          description="Analyzing your finances..." 
          showMonthPicker={false}
          action={
            <div className="flex items-center gap-2">
              <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                <SelectTrigger className="h-9 w-[110px] text-xs bg-background rounded-xl border-border/50" disabled>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {MONTHS.map((m, idx) => (
                    <SelectItem key={m} value={String(idx + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                <SelectTrigger className="h-9 w-[80px] text-xs bg-background rounded-xl border-border/50" disabled>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
        <div className="h-64 bg-muted/20 animate-pulse rounded-2xl border border-border/10" />
      </div>
    );
  }

  const {
    totalIncome,
    totalNeeds,
    totalWants,
    totalUnnecessary,
    totalGoals,
    totalSavings,
    rentExpense,
    totalLiquidCash,
    totalBorrowedPending
  } = healthData;

  // 50-30-20 Calculations
  const needsPct = totalIncome > 0 ? (totalNeeds / totalIncome) * 100 : 0;
  const wantsPct = totalIncome > 0 ? ((totalWants + totalUnnecessary) / totalIncome) * 100 : 0;
  const savingsPct = totalIncome > 0 ? ((totalSavings + totalGoals) / totalIncome) * 100 : 0;

  const targetNeeds = totalIncome * 0.50;
  const targetWants = totalIncome * 0.30;
  const targetSavings = totalIncome * 0.20;

  // Stability Indicators
  const rentRulePassed = totalIncome > 0 && rentExpense <= (totalIncome * 0.30);
  
  const emergencyTarget = totalNeeds * 6;
  const emergencyRulePassed = totalLiquidCash >= emergencyTarget;
  const emergencyMonthsCovered = totalNeeds > 0 ? totalLiquidCash / totalNeeds : 0;

  const dtiRatio = totalIncome > 0 ? (totalBorrowedPending / totalIncome) * 100 : 0;
  const dtiRulePassed = dtiRatio <= 36;

  // Calculate detailed financial health score (0 - 100)
  // 1. Savings Rate (30 pts max)
  let savingsScore = 0;
  if (totalIncome > 0) {
    savingsScore = Math.min(30, (savingsPct / 20) * 30);
  }
  // 2. Needs Adherence (30 pts max)
  let needsScore = 0;
  if (totalIncome > 0) {
    if (needsPct <= 50) {
      needsScore = 30;
    } else {
      needsScore = Math.max(0, 30 - ((needsPct - 50) / 50) * 30);
    }
  }
  // 3. Debt-to-Income (20 pts max)
  let dtiScore = 20;
  if (totalIncome > 0 && totalBorrowedPending > 0) {
    if (dtiRatio <= 36) {
      dtiScore = 20;
    } else {
      dtiScore = Math.max(0, 20 - ((dtiRatio - 36) / 64) * 20);
    }
  }
  // 4. Emergency Fund cover (20 pts max)
  const emergencyScore = Math.min(20, (emergencyMonthsCovered / 6) * 20);

  const finalScore = Math.round(savingsScore + needsScore + dtiScore + emergencyScore);

  // Score description
  let verdict = "Needs Attention";
  let verdictColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  
  if (totalIncome > 0) {
    if (finalScore >= 80) {
      verdict = "Excellent";
      verdictColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    } else if (finalScore >= 50) {
      verdict = "Good";
      verdictColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }
  } else {
    verdict = "No Income Data";
    verdictColor = "text-muted-foreground bg-muted border-border/50";
  }

  // Dynamic recommendations/tips
  const tips = [];
  if (totalIncome > 0) {
    if (needsPct > 50) {
      tips.push({
        title: "Reduce Fixed Expenses",
        desc: `Your essential needs take up ${needsPct.toFixed(1)}% of income (target: 50%). Review subscription renewals, look for competitive utility rates, or cut rent burdens if possible.`,
        icon: TrendingDown,
        color: "text-rose-500 bg-rose-500/5 border-rose-500/10"
      });
    }
    if (wantsPct > 30) {
      tips.push({
        title: "Curb Lifestyle Creep",
        desc: `Lifestyle desires take up ${wantsPct.toFixed(1)}% of your income (target: 30%). Try utilizing a 24-hour waiting period before checking out non-essential shopping carts.`,
        icon: Sparkles,
        color: "text-amber-500 bg-amber-500/5 border-amber-500/10"
      });
    }
    if (totalUnnecessary > 0) {
      const savingsImpact = ((totalUnnecessary / totalIncome) * 100).toFixed(1);
      tips.push({
        title: "Plug Unnecessary Leaks",
        desc: `You logged ${formatCurrency(totalUnnecessary)} under 'Unnecessary Spending' this month. Pausing these leaks would boost your savings rate by ${savingsImpact}%!`,
        icon: AlertCircle,
        color: "text-rose-500 bg-rose-500/5 border-rose-500/10"
      });
    }
    if (savingsPct < 20) {
      tips.push({
        title: "Automate Savings First",
        desc: `Your savings rate is ${savingsPct.toFixed(1)}% (target: 20%). Automate a percentage of your salary to route directly to investments at the start of each month.`,
        icon: PiggyBank,
        color: "text-blue-500 bg-blue-500/5 border-blue-500/10"
      });
    }
    if (totalBorrowedPending > 0 && dtiRatio > 36) {
      tips.push({
        title: "Tackle Debt Exposure",
        desc: `Your debt-to-income ratio is ${dtiRatio.toFixed(1)}% (target: <36%). Try the debt avalanche method (paying off high-interest debt first) and freeze new borrows.`,
        icon: TrendingUp,
        color: "text-rose-500 bg-rose-500/5 border-rose-500/10"
      });
    }
    if (emergencyMonthsCovered < 6) {
      tips.push({
        title: "Secure Emergency Buffer",
        desc: `Your liquid cash covers ${emergencyMonthsCovered.toFixed(1)} months of needs. Prioritize building a cash buffer of ${formatCurrency(emergencyTarget)} in a high-yield account.`,
        icon: ShieldCheck,
        color: "text-amber-500 bg-amber-500/5 border-amber-500/10"
      });
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24"
    >
      <PageHeader
        title="Financial Health Audit"
        description="Analysis of monthly spending metrics against the 50-30-20 blueprint"
        showMonthPicker={false}
        action={
          <div className="flex items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
              <SelectTrigger className="h-9 w-[110px] text-xs bg-background rounded-xl border-border/50">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={String(idx + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
              <SelectTrigger className="h-9 w-[80px] text-xs bg-background rounded-xl border-border/50">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Visual Health Score Gauge */}
        <Card className="flex flex-col items-center justify-center p-6 text-center border-border/50 shadow-sm">
          <CardHeader className="pb-2 text-center w-full">
            <CardTitle className="text-base font-semibold">Health Score</CardTitle>
            <CardDescription>Overall index of your wealth stability</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2 w-full">
            {totalIncome > 0 ? (
              <div className="relative flex items-center justify-center w-40 h-40">
                {/* SVG Circular progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    className="stroke-muted"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    className="stroke-primary transition-all duration-500"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={427}
                    strokeDashoffset={427 - (427 * finalScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-foreground">{finalScore}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">/ 100</span>
                </div>
              </div>
            ) : (
              <div className="w-40 h-40 rounded-full border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-xs p-4">
                💡 Add income records for this month to generate your health score.
              </div>
            )}
            
            <div className={cn("px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider mt-6", verdictColor)}>
              {verdict}
            </div>
          </CardContent>
        </Card>

        {/* 50-30-20 Rules Breakdown */}
        <Card className="md:col-span-2 border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base font-semibold">50-30-20 Budget Analysis</CardTitle>
            <CardDescription>Evaluating categorized expenses against targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5 flex-1 flex flex-col justify-around">
            {/* Needs */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-foreground font-semibold">Needs (Target: 50%)</span>
                <span className="font-mono text-muted-foreground">{formatCurrency(totalNeeds)} ({needsPct.toFixed(1)}%)</span>
              </div>
              <Progress value={needsPct} max={100} className={cn("h-2", needsPct > 50 ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500")} />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>Rent, bills, essentials</span>
                {totalIncome > 0 && (
                  <span className={cn("font-medium", needsPct > 50 ? "text-rose-500" : "text-emerald-500")}>
                    {needsPct > 50 ? `Over by ${formatCurrency(totalNeeds - targetNeeds)}` : `Room for ${formatCurrency(targetNeeds - totalNeeds)}`}
                  </span>
                )}
              </div>
            </div>

            {/* Wants */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-foreground font-semibold">Wants (Target: 30%)</span>
                <span className="font-mono text-muted-foreground">{formatCurrency(totalWants + totalUnnecessary)} ({wantsPct.toFixed(1)}%)</span>
              </div>
              <Progress value={wantsPct} max={100} className={cn("h-2", wantsPct > 30 ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500")} />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>Lifestyle, hobbies, unnecessary items</span>
                {totalIncome > 0 && (
                  <span className={cn("font-medium", wantsPct > 30 ? "text-rose-500" : "text-emerald-500")}>
                    {wantsPct > 30 ? `Over by ${formatCurrency((totalWants + totalUnnecessary) - targetWants)}` : `Room for ${formatCurrency(targetWants - (totalWants + totalUnnecessary))}`}
                  </span>
                )}
              </div>
            </div>

            {/* Savings */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-foreground font-semibold">Savings & Investments (Target: 20%)</span>
                <span className="font-mono text-muted-foreground">{formatCurrency(totalSavings + totalGoals)} ({savingsPct.toFixed(1)}%)</span>
              </div>
              <Progress value={savingsPct} max={100} className={cn("h-2", savingsPct < 20 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")} />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>SIP, savings, manual goal contributions</span>
                {totalIncome > 0 && (
                  <span className={cn("font-medium", savingsPct < 20 ? "text-amber-500" : "text-emerald-500")}>
                    {savingsPct < 20 ? `Short by ${formatCurrency(targetSavings - (totalSavings + totalGoals))}` : `Surplus of ${formatCurrency((totalSavings + totalGoals) - targetSavings)}`}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Core Rules Checklist */}
        <Card className="md:col-span-1 border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base font-semibold">Stability Indicators</CardTitle>
            <CardDescription>Core rules checklists</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 flex-1 flex flex-col justify-center">
            {/* Rent indicator */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card shadow-xs">
              {rentRulePassed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <p className="font-bold text-foreground">Rent Budget ({"<"} 30%)</p>
                <p className="text-muted-foreground mt-0.5">
                  Housing rent is {totalIncome > 0 ? ((rentExpense / totalIncome) * 100).toFixed(0) : 0}% of income.
                </p>
              </div>
            </div>

            {/* Emergency fund indicator */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card shadow-xs">
              {emergencyRulePassed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <p className="font-bold text-foreground">Emergency Cover (6-Mo)</p>
                <p className="text-muted-foreground mt-0.5">
                  Buffer: {emergencyMonthsCovered.toFixed(1)} months of needs ({formatCurrency(totalLiquidCash)} / {formatCurrency(emergencyTarget)} target)
                </p>
              </div>
            </div>

            {/* Debt to Income ratio indicator */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card shadow-xs">
              {dtiRulePassed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <p className="font-bold text-foreground">Debt-to-Income ({"<"} 36%)</p>
                <p className="text-muted-foreground mt-0.5">
                  DTI is {dtiRatio.toFixed(1)}% based on pending borrowed amount of {formatCurrency(totalBorrowedPending)}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actionable Tips Column */}
        <Card className="md:col-span-2 border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Actionable Wealth Tips
            </CardTitle>
            <CardDescription>Tailored suggestions to optimize cash flows</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 flex-1">
            {tips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="font-bold text-foreground text-sm">Perfect Financial Health!</p>
                <p className="text-xs mt-0.5">All rule thresholds check out positive this month. Keep up the disciplined habits!</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {tips.map((tip, idx) => (
                  <div key={idx} className={cn("p-3.5 border rounded-xl flex items-start gap-3 text-xs leading-relaxed", tip.color)}>
                    <tip.icon className="w-4 h-4 shrink-0 mt-0.5 text-foreground" />
                    <div>
                      <p className="font-bold text-foreground">{tip.title}</p>
                      <p className="text-muted-foreground mt-1 leading-normal">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
