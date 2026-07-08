"use client";

import { PageHeader } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  LayoutDashboard, 
  HeartPulse, 
  Target, 
  PiggyBank, 
  Sparkles, 
  Calculator, 
  Activity, 
  Info, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Wallet,
  Coins
} from "lucide-react";
import { XP_REWARDS } from "@/constants";

export function GuideClient() {
  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <PageHeader
        title="Methodology Guide"
        description="Learn the calculations, rules, and mathematical formulas behind Nova Finance metrics"
        showMonthPicker={false}
      />

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex! w-full! flex-nowrap! overflow-x-auto! h-auto! items-center whitespace-nowrap scrollbar-none gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/40 md:grid! md:grid-cols-5!">
          <TabsTrigger value="dashboard" className="py-2.5 rounded-lg cursor-pointer shrink-0 px-3">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="health" className="py-2.5 rounded-lg cursor-pointer shrink-0 px-3">
            <HeartPulse className="w-4 h-4" /> Health Score
          </TabsTrigger>
          <TabsTrigger value="budgeting" className="py-2.5 rounded-lg cursor-pointer shrink-0 px-3">
            <Calculator className="w-4 h-4" /> 50-30-20 Rules
          </TabsTrigger>
          <TabsTrigger value="goals" className="py-2.5 rounded-lg cursor-pointer shrink-0 px-3">
            <Target className="w-4 h-4" /> Goals & Savings
          </TabsTrigger>
          <TabsTrigger value="xp" className="py-2.5 rounded-lg cursor-pointer shrink-0 px-3">
            <Sparkles className="w-4 h-4" /> Gamification
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Dashboard Metrics */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border/50 shadow-sm rounded-2xl bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  Cash Flow & Balances
                </CardTitle>
                <CardDescription>
                  How your top-level balances and indicators are computed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <div>
                  <h4 className="font-bold text-foreground mb-1 text-sm">Available Balance</h4>
                  <p className="mb-2">
                    Your current spendable cash: all recorded income, minus all recorded
                    expenses, minus every amount you have set aside into savings goals
                    (goal contributions are treated as money moved out of your balance).
                  </p>
                  <pre className="bg-muted p-2 rounded-xl text-[10px] font-mono text-foreground border border-border/40">
                    Available Balance = Total Income - Total Expenses - Goal Contributions
                  </pre>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1 text-sm">Spent Today & Monthly Spend</h4>
                  <p>
                    Aggregations of recorded transaction amounts within the active day or calendar month bounds (synced to your local timezone).
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1 text-sm">Net Owed (Credit & Debts)</h4>
                  <p className="mb-2">
                    The net difference between what people owe you and what you owe others, computed from pending debt records.
                  </p>
                  <pre className="bg-muted p-2 rounded-xl text-[10px] font-mono text-foreground border border-border/40">
                    Net Owed = Total Lent Outstanding - Total Borrowed Outstanding
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-sm rounded-2xl bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-primary" />
                  Budgeting & Remaining Indicators
                </CardTitle>
                <CardDescription>
                  How budget leftovers and actual spend limits are tracked.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <div>
                  <h4 className="font-bold text-foreground mb-1 text-sm">Remaining Budget</h4>
                  <p className="mb-2">
                    The sum of unused allowances across your monthly budgets. To prevent overspent categories from falsely masking allowances in other categories, each category is computed individually:
                  </p>
                  <pre className="bg-muted p-2 rounded-xl text-[10px] font-mono text-foreground border border-border/40">
                    Remaining Budget = Σ Max(Budget Limit - Spent in Category, 0)
                  </pre>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1 text-sm">Safe to Spend</h4>
                  <p className="mb-2">
                    Your real-time cash balance that is safely available to spend or invest. It factors in your savings surplus minus the money you have already committed to spending in your budgets.
                  </p>
                  <pre className="bg-muted p-2 rounded-xl text-[10px] font-mono text-foreground border border-border/40">
                    Safe to Spend = Net Monthly Savings - Remaining Budget
                  </pre>
                  <p className="mt-2 text-[11px] text-primary/80 font-medium">
                    🔍 Note: Net Monthly Savings is calculated as Monthly Income - Monthly Expenses.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Financial Health Score */}
        <TabsContent value="health" className="mt-6 space-y-6">
          <Card className="border border-border/50 shadow-sm rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Financial Health Score (0 - 100)
              </CardTitle>
              <CardDescription>
                Your Financial Health Audit score dynamically rates stability based on four weighted criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs text-muted-foreground leading-relaxed">
              <p>
                The audit compiles four key performance indicators (KPIs) to grade your month on a 100-point scale:
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-muted/30 border border-border/40 p-4 rounded-2xl space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center justify-between">
                    <span>1. Savings Rate Adherence</span>
                    <span className="text-primary font-mono">Max 30 pts</span>
                  </h4>
                  <p>
                    Evaluates the proportion of income put towards investments, savings goals, and leftover unspent cash.
                  </p>
                  <pre className="bg-muted p-2 rounded-lg text-[9px] font-mono text-foreground border border-border/20">
                    Score = Min(30, (Savings Rate % / 20%) * 30)
                  </pre>
                </div>

                <div className="bg-muted/30 border border-border/40 p-4 rounded-2xl space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center justify-between">
                    <span>2. Needs Budget Control</span>
                    <span className="text-primary font-mono">Max 30 pts</span>
                  </h4>
                  <p>
                    Evaluates compliance with the 50% limit for essential Needs. Overspending in needs triggers linear point deduction.
                  </p>
                  <pre className="bg-muted p-2 rounded-lg text-[9px] font-mono text-foreground border border-border/20">
                    If Needs % ≤ 50: Score = 30
                    Else: Score = Max(0, 30 - ((Needs % - 50) / 50) * 30)
                  </pre>
                </div>

                <div className="bg-muted/30 border border-border/40 p-4 rounded-2xl space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center justify-between">
                    <span>3. Debt-to-Income (DTI) Ratio</span>
                    <span className="text-primary font-mono">Max 20 pts</span>
                  </h4>
                  <p>
                    Measures outstanding borrowed amount against current monthly income. Points are deducted if DTI exceeds 36%.
                  </p>
                  <pre className="bg-muted p-2 rounded-lg text-[9px] font-mono text-foreground border border-border/20">
                    DTI % = (Total Outstanding Debt / Monthly Income) * 100
                    If DTI ≤ 36%: Score = 20
                    Else: Score = Max(0, 20 - ((DTI - 36) / 64) * 20)
                  </pre>
                </div>

                <div className="bg-muted/30 border border-border/40 p-4 rounded-2xl space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center justify-between">
                    <span>4. Emergency Fund Buffer</span>
                    <span className="text-primary font-mono">Max 20 pts</span>
                  </h4>
                  <p>
                    Measures how many months of essential needs could be covered by your overall liquid cash (all-time net balance).
                  </p>
                  <pre className="bg-muted p-2 rounded-lg text-[9px] font-mono text-foreground border border-border/20">
                    Months Covered = All-Time Balance / Monthly Needs
                    Score = Min(20, (Months Covered / 6) * 20)
                  </pre>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <h4 className="font-bold text-foreground text-sm mb-2">Audit Verdict Thresholds</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="border border-emerald-500/20 bg-emerald-500/5 p-3 rounded-xl">
                    <span className="block font-bold text-emerald-600 dark:text-emerald-500 text-sm">Excellent</span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">Score ≥ 80</span>
                  </div>
                  <div className="border border-amber-500/20 bg-amber-500/5 p-3 rounded-xl">
                    <span className="block font-bold text-amber-600 dark:text-amber-400 text-sm">Good</span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">Score 50 - 79</span>
                  </div>
                  <div className="border border-rose-500/20 bg-rose-500/5 p-3 rounded-xl">
                    <span className="block font-bold text-rose-600 dark:text-rose-400 text-sm">Needs Attention</span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">Score &lt; 50</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: 50-30-20 Budgeting Rule */}
        <TabsContent value="budgeting" className="mt-6 space-y-6">
          <Card className="border border-border/50 shadow-sm rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                The 50-30-20 Budgeting framework
              </CardTitle>
              <CardDescription>
                Nova Finance maps expense tags directly to standard personal finance guidelines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs text-muted-foreground leading-relaxed">
              <p>
                Instead of rigidly categorizing transactions based on merchants, Nova allows you to tag individual expenses under four main categories:
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start pb-4 border-b border-border/40">
                  <span className="text-base px-2 py-1 bg-primary/10 text-primary rounded-lg font-bold min-w-[50px] text-center">
                    50%
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">Needs (Essentials)</h4>
                    <p className="mt-1">
                      Required expenses for survival and baseline functioning. This includes Rent, Utilities, Basic Groceries, Transport, Health, and Debt repayment.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start pb-4 border-b border-border/40">
                  <span className="text-base px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg font-bold min-w-[50px] text-center">
                    30%
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">Wants (Lifestyle)</h4>
                    <p className="mt-1">
                      Discretionary spending that adds fun or convenience. Includes Dining Out, Entertainment, Subscriptions, Hobbies, Shopping, and Travel.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start pb-4 border-b border-border/40">
                  <span className="text-base px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-lg font-bold min-w-[50px] text-center">
                    20%
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">Investments & Savings (Future)</h4>
                    <p className="mt-1">
                      Money allocated to improve your future financial standing. Includes savings deposits, mutual funds, stock investments, pension contributions, and dedicated Savings Goal deposits.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <span className="text-base px-2 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded-lg font-bold min-w-[50px] text-center">
                    0%
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">Unnecessary Spending</h4>
                    <p className="mt-1">
                      Spending leaks that provide no true utility or lasting happiness (e.g., forgotten subscriptions, late payment penalties, impulse purchases). 
                      <span className="text-rose-500 font-medium ml-1">
                        *Note: To penalize financial leaks, these are aggregated with Wants for ratio auditing.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 bg-muted/20 p-4 rounded-2xl flex items-start gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Rent Multiplier Cap:</strong> Part of the stability rules verifies that Rent alone does not swallow more than <strong>30%</strong> of your total income.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Savings Goals */}
        <TabsContent value="goals" className="mt-6 space-y-6">
          <Card className="border border-border/50 shadow-sm rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Savings Goals Tracking
              </CardTitle>
              <CardDescription>
                How target milestones, progress, and funding impact your accounting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
              <p>
                Savings goals allow you to set cash reserve milestones (such as an emergency fund or a major purchase).
              </p>
              
              <div>
                <h4 className="font-bold text-foreground mb-1 text-sm">Progress Percentage</h4>
                <p className="mb-2">
                  Goal progress is computed based on cumulative contribution deposits:
                </p>
                <pre className="bg-muted p-2 rounded-xl text-[10px] font-mono text-foreground border border-border/40">
                  Progress % = Min((Total Contributed / Target Amount) * 100, 100)
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-1 text-sm">Remaining Amount</h4>
                <pre className="bg-muted p-2 rounded-xl text-[10px] font-mono text-foreground border border-border/40">
                  Remaining Amount = Max(Target Amount - Total Contributed, 0)
                </pre>
              </div>

              <div className="pt-4 border-t border-border/40 bg-muted/20 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground text-xs">How Funding Contributions Affect Your Ratios</p>
                  <p className="text-[11px] leading-relaxed">
                    When you contribute funds to a goal, this cash is deducted from your immediate cash flow balance. However, to reward good behavior, the system logs this contribution under the <strong>Savings & Investments (20%)</strong> bucket of your Financial Health Audit, raising your overall score.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Gamification & XP */}
        <TabsContent value="xp" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border/50 shadow-sm rounded-2xl bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  XP Reward System
                </CardTitle>
                <CardDescription>
                  Nova Finance uses gamification mechanics to build healthy tracking habits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <p>
                  You earn Experience Points (XP) for actions that keep you aligned with your financial routine.
                </p>
                
                <Table className="border border-border/40 rounded-xl overflow-hidden">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-bold text-foreground text-xs">Action / Event</TableHead>
                      <TableHead className="font-bold text-foreground text-xs text-right">XP Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-foreground flex items-center gap-2">
                        <Coins className="w-3.5 h-3.5 text-primary" />
                        Log a regular transaction (Expense)
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">+{XP_REWARDS.LOG_EXPENSE} XP</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-foreground flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        Log regular cash inflows (Income)
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">+{XP_REWARDS.LOG_INCOME} XP</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-foreground flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        Confirm a pending recurring bill expense
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">+{XP_REWARDS.LOG_EXPENSE} XP</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-foreground flex items-center gap-2">
                        <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
                        Maintain a monthly budget limit
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">+{XP_REWARDS.STAY_IN_BUDGET} XP</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-sm rounded-2xl bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Level Progression
                </CardTitle>
                <CardDescription>
                  XP required to reach different financial proficiency levels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <p>
                  As you accumulate XP, you level up. Below is the XP threshold structure:
                </p>

                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between font-mono font-bold text-[10px] mb-1">
                      <span className="text-foreground">Level 1 (Novice)</span>
                      <span className="text-muted-foreground">0 XP</span>
                    </div>
                    <Progress value={100} className="h-1 bg-primary [&_[data-slot=progress-indicator]]:bg-primary" />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono font-bold text-[10px] mb-1">
                      <span className="text-foreground">Level 2 (Starter)</span>
                      <span className="text-muted-foreground">100 XP</span>
                    </div>
                    <Progress value={20} className="h-1 bg-muted [&_[data-slot=progress-indicator]]:bg-primary" />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono font-bold text-[10px] mb-1">
                      <span className="text-foreground">Level 3 (Planner)</span>
                      <span className="text-muted-foreground">250 XP</span>
                    </div>
                    <Progress value={0} className="h-1 bg-muted [&_[data-slot=progress-indicator]]:bg-primary" />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono font-bold text-[10px] mb-1">
                      <span className="text-foreground">Level 5 (Expert)</span>
                      <span className="text-muted-foreground">1,000 XP</span>
                    </div>
                    <Progress value={0} className="h-1 bg-muted [&_[data-slot=progress-indicator]]:bg-primary" />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono font-bold text-[10px] mb-1">
                      <span className="text-foreground">Level 10 (Wealth Master)</span>
                      <span className="text-muted-foreground">10,000 XP</span>
                    </div>
                    <Progress value={0} className="h-1 bg-muted [&_[data-slot=progress-indicator]]:bg-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
