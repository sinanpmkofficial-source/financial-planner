"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import { getFinancialHealthData } from "@/actions/financial-health";
import { getGoalsWithProgress, createGoal, addGoalContribution, deleteGoal } from "@/actions/goals";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Target, CheckCircle2, XCircle, AlertCircle, Coins, Trash2, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FinancialHealthClient() {
  const { dateRange, setDashboardDirty } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);

  // Dialog states
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [fundGoalOpen, setFundGoalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Form states
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [fundAmount, setFundAmount] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const month = dateRange.from.getMonth() + 1;
      const year = dateRange.from.getFullYear();
      
      const [hData, gData] = await Promise.all([
        getFinancialHealthData(month, year),
        getGoalsWithProgress()
      ]);
      
      setHealthData(hData);
      setGoals(gData);
    } catch (err) {
      toast.error("Failed to load financial health data");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;
    
    const res = await createGoal({ name: goalName, targetAmount: Number(goalTarget) });
    if (res.success) {
      toast.success("Goal created");
      setNewGoalOpen(false);
      setGoalName("");
      setGoalTarget("");
      fetchData();
    } else {
      toast.error(res.error);
    }
  };

  const handleFundGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !fundAmount) return;

    const res = await addGoalContribution(selectedGoalId, Number(fundAmount), new Date().toISOString());
    if (res.success) {
      toast.success("Funds added to goal");
      setDashboardDirty(true); // Funding a goal affects net balance and dashboard stats
      setFundGoalOpen(false);
      setFundAmount("");
      fetchData();
    } else {
      toast.error(res.error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal? All tracked contributions will be lost.")) return;
    const res = await deleteGoal(id);
    if (res.success) {
      toast.success("Goal deleted");
      fetchData();
    }
  };

  if (loading || !healthData) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financial Health" description="Analyzing your finances..." />
        <div className="h-64 bg-muted/20 animate-pulse rounded-2xl border border-border/10" />
      </div>
    );
  }

  const { totalIncome, totalNeeds, totalFun, totalGoals, totalSavings, rentExpense, totalLiquidCash } = healthData;

  // 55/25/15/5 Calculations
  const needsPct = totalIncome > 0 ? (totalNeeds / totalIncome) * 100 : 0;
  const savingsPct = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const goalsPct = totalIncome > 0 ? (totalGoals / totalIncome) * 100 : 0;
  const funPct = totalIncome > 0 ? (totalFun / totalIncome) * 100 : 0;

  // Targets
  const targetNeeds = totalIncome * 0.55;
  const targetSavings = totalIncome * 0.25;
  const targetGoals = totalIncome * 0.15;
  const targetFun = totalIncome * 0.05;

  // Rules Checklist
  const rentRulePassed = totalIncome > 0 && rentExpense <= (totalIncome * 0.30);
  const emergencyRulePassed = totalLiquidCash >= (totalNeeds * 6);
  const emergencyTarget = totalNeeds * 6;
  const savingsRatePassed = totalIncome > 0 && (totalSavings + totalGoals) >= (totalIncome * 0.20);

  // Overall Verdict
  let verdict = "Needs Attention";
  let verdictColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  let score = 0;
  
  if (totalIncome > 0) {
    if (needsPct <= 60) score++;
    if (savingsPct >= 20) score++;
    if (goalsPct >= 10) score++;
    if (rentRulePassed) score++;
    if (emergencyRulePassed) score++;
    if (savingsRatePassed) score++;

    if (score >= 5) {
      verdict = "Excellent";
      verdictColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    } else if (score >= 3) {
      verdict = "Good";
      verdictColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }
  } else {
    verdict = "No Income Data";
    verdictColor = "text-muted-foreground bg-muted border-border/50";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Health & Goals"
        description="Analyze your spending against the 55/25/15/5 rule"
        showMonthPicker
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 55/25/15/5 Breakdown */}
        <Card className="lg:col-span-2 shadow-sm border-border/50 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                55/25/15/5 Blueprint
              </CardTitle>
              <CardDescription>Based on this month's categorized income of {formatCurrency(totalIncome)}</CardDescription>
            </div>
            <div className={cn("px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider", verdictColor)}>
              {verdict}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Needs */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-foreground">Needs (Target: 55%)</span>
                <div className="text-right">
                  <span className="font-mono text-muted-foreground block">{formatCurrency(totalNeeds)} ({needsPct.toFixed(1)}%)</span>
                  {totalIncome > 0 && (
                    <span className={cn("text-[10px] font-medium block", needsPct > 55 ? "text-rose-500" : "text-emerald-500")}>
                      {needsPct > 55 ? `Over by ${formatCurrency(totalNeeds - targetNeeds)}` : `Under by ${formatCurrency(targetNeeds - totalNeeds)}`}
                    </span>
                  )}
                </div>
              </div>
              <Progress value={needsPct} max={100} className={cn("h-2", needsPct > 55 ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500")} />
              <p className="text-xs text-muted-foreground">Rent, food, utilities, transport. {needsPct > 55 ? "Try to reduce fixed costs." : "Excellent control of fixed costs."}</p>
            </div>

            {/* Savings */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-foreground">Savings/Future (Target: 25%)</span>
                <div className="text-right">
                  <span className="font-mono text-muted-foreground block">{formatCurrency(totalSavings)} ({savingsPct.toFixed(1)}%)</span>
                  {totalIncome > 0 && (
                    <span className={cn("text-[10px] font-medium block", savingsPct < 25 ? "text-amber-500" : "text-emerald-500")}>
                      {savingsPct < 25 ? `Short by ${formatCurrency(targetSavings - totalSavings)}` : `Surplus of ${formatCurrency(totalSavings - targetSavings)}`}
                    </span>
                  )}
                </div>
              </div>
              <Progress value={savingsPct} max={100} className={cn("h-2", savingsPct < 25 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")} />
              <p className="text-xs text-muted-foreground">Investments and unspent cash. {savingsPct < 25 ? "Aim to save more of your income before spending." : "Great job securing your future."}</p>
            </div>

            {/* Goals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-foreground">Goals (Target: 15%)</span>
                <div className="text-right">
                  <span className="font-mono text-muted-foreground block">{formatCurrency(totalGoals)} ({goalsPct.toFixed(1)}%)</span>
                  {totalIncome > 0 && (
                    <span className="text-[10px] font-medium text-blue-500 block">
                      {goalsPct < 15 ? `Room for ${formatCurrency(targetGoals - totalGoals)}` : `Above target by ${formatCurrency(totalGoals - targetGoals)}`}
                    </span>
                  )}
                </div>
              </div>
              <Progress value={goalsPct} max={100} className="h-2 [&>div]:bg-blue-500" />
              <p className="text-xs text-muted-foreground">Manual funds routed to specific goals (e.g. Gold, Debt).</p>
            </div>

            {/* Fun */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-foreground">Fun (Target: 5%)</span>
                <div className="text-right">
                  <span className="font-mono text-muted-foreground block">{formatCurrency(totalFun)} ({funPct.toFixed(1)}%)</span>
                  {totalIncome > 0 && (
                    <span className={cn("text-[10px] font-medium block", funPct > 5 ? "text-amber-500" : "text-emerald-500")}>
                      {funPct > 5 ? `Over by ${formatCurrency(totalFun - targetFun)}` : `Under by ${formatCurrency(targetFun - totalFun)}`}
                    </span>
                  )}
                </div>
              </div>
              <Progress value={funPct} max={100} className={cn("h-2", funPct > 5 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")} />
              <p className="text-xs text-muted-foreground">Hobbies, eating out, guilt-free spending.</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Rules Checklist */}
        <Card className="shadow-sm border-border/50 bg-muted/10 flex flex-col">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Rules Checklist
            </CardTitle>
            <CardDescription>Core stability indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
              {rentRulePassed ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold text-sm">Housing {"<"} 30%</p>
                <p className="text-xs text-muted-foreground mt-1">Rent ({formatCurrency(rentExpense)}) is {totalIncome > 0 ? ((rentExpense/totalIncome)*100).toFixed(1) : 0}% of income.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
              {emergencyRulePassed ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold text-sm">6-Month Emergency Fund</p>
                <p className="text-[10px] font-mono mt-1 text-muted-foreground">Target: {formatCurrency(emergencyTarget)}</p>
                <p className="text-[10px] font-mono mt-0.5 font-bold text-foreground">Current: {formatCurrency(totalLiquidCash)}</p>
                {!emergencyRulePassed && (
                  <p className="text-[10px] text-rose-500 mt-1">Shortfall: {formatCurrency(Math.max(0, emergencyTarget - totalLiquidCash))}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
              {savingsRatePassed ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold text-sm">Savings Rate {">="} 20%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You are saving/investing {totalIncome > 0 ? (((totalSavings + totalGoals)/totalIncome)*100).toFixed(1) : 0}% of your total income.
                </p>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-xs text-primary/80 font-medium">
              Mapping categories in Settings to their correct "Financial Bucket" is required for accurate 55/25/15/5 analysis.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goal Tracker */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Goal Tracker</h2>
            <p className="text-sm text-muted-foreground">Manually allocate funds toward specific objectives</p>
          </div>
          <Button size="sm" className="gap-1.5 cursor-pointer" onClick={() => setNewGoalOpen(true)}>
            <Plus className="w-4 h-4" /> New Goal
          </Button>
          <Dialog open={newGoalOpen} onOpenChange={setNewGoalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Financial Goal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGoal} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Goal Name</Label>
                  <Input required placeholder="e.g., Emergency Fund, Laptop" value={goalName} onChange={e => setGoalName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Target Amount (₹)</Label>
                  <Input required type="number" step="1" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">Save Goal</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.length === 0 ? (
            <div className="col-span-full py-12 text-center border border-dashed rounded-2xl bg-muted/5">
              <p className="text-muted-foreground font-medium">No goals tracked yet.</p>
            </div>
          ) : (
            goals.map((goal) => (
              <Card key={goal._id} className="relative shadow-sm border-border/50 group transition-all hover:border-foreground/30">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 cursor-pointer"
                  onClick={() => handleDeleteGoal(goal._id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <h4 className="font-semibold leading-none pr-6">{goal.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Target: {formatCurrency(goal.targetAmount)}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-mono font-medium">
                      <span>{formatCurrency(goal.totalContributed)}</span>
                      <span>{goal.progressPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={goal.progressPercentage} className="h-2" />
                    {goal.targetAmount - goal.totalContributed > 0 && (
                      <p className="text-[10px] text-muted-foreground text-right mt-1">
                        {formatCurrency(goal.targetAmount - goal.totalContributed)} left
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full gap-1.5 cursor-pointer"
                    onClick={() => { setSelectedGoalId(goal._id); setFundGoalOpen(true); }}
                  >
                    <Coins className="w-3.5 h-3.5" /> Add Funds
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={fundGoalOpen} onOpenChange={setFundGoalOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Funds to Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFundGoal} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Contribution Amount (₹)</Label>
                <Input required type="number" step="0.01" value={fundAmount} onChange={e => setFundAmount(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">This amount will be tracked towards this goal and counted as 'Goals' in your 55/25/15/5 analysis for this month.</p>
              <Button type="submit" className="w-full cursor-pointer">Record Contribution</Button>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
