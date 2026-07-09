"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import { getGoalsWithProgress, createGoal, updateGoal, addGoalContribution, deleteGoal, getGoalContributions, deleteGoalContribution, type GoalContributionResult } from "@/actions/goals";
import { formatCurrency, formatDate } from "@/lib/format";
import { toPaise, toRupees } from "@/lib/money";
import { runOptimistic } from "@/lib/optimistic";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Coins, Trash2, Calendar, CheckCircle2, Pencil, History, Clock, Target, CalendarClock } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 90, damping: 15 }
  }
} as const;


interface GoalWithProgress {
  _id: string;
  name: string;
  targetAmount: number;
  icon: string;
  color: string;
  targetDate: string | null;
  createdAt: string;
  totalContributed: number;
  progressPercentage: number;
  contributionCount: number;
  lastContributedAt: string | null;
}

/** Days from today until a target date; negative when overdue. */
function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function GoalsClient() {
  const { setDashboardDirty, goalsCache, updateGoalsCache } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);

  // Dialog states
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [fundGoalOpen, setFundGoalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // History dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyGoal, setHistoryGoal] = useState<GoalWithProgress | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [contributions, setContributions] = useState<GoalContributionResult[]>([]);

  // Form states
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalIcon, setGoalIcon] = useState("Target");
  const [goalColor, setGoalColor] = useState("hsl(217, 91%, 60%)");
  const [goalTargetDate, setGoalTargetDate] = useState<Date | undefined>(undefined);
  const [fundAmount, setFundAmount] = useState("");

  // Hydrate goals state from local cache on client mount
  useEffect(() => {
    if (goalsCache && goalsCache.length > 0) {
      setGoals(goalsCache as GoalWithProgress[]);
      setLoading(false);
    }
  }, [goalsCache]);

  const fetchData = useCallback(async () => {
    const currentCache = useUIStore.getState().goalsCache;
    if (!currentCache || currentCache.length === 0) {
      setLoading(true);
    }
    try {
      const gData = await getGoalsWithProgress();
      setGoals(gData as GoalWithProgress[]);
      updateGoalsCache(gData);
    } catch (err) {
      console.error("Failed to fetch goals", err);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [updateGoalsCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetGoalForm = () => {
    setGoalName("");
    setGoalTarget("");
    setGoalIcon("Target");
    setGoalColor("hsl(217, 91%, 60%)");
    setGoalTargetDate(undefined);
    setEditingGoalId(null);
  };

  const handleOpenCreate = () => {
    resetGoalForm();
    setNewGoalOpen(true);
  };

  const handleOpenEdit = (goal: GoalWithProgress) => {
    setEditingGoalId(goal._id);
    setGoalName(goal.name);
    setGoalTarget(String(toRupees(goal.targetAmount)));
    setGoalIcon(goal.icon || "Target");
    setGoalColor(goal.color || "hsl(217, 91%, 60%)");
    setGoalTargetDate(goal.targetDate ? new Date(goal.targetDate) : undefined);
    setNewGoalOpen(true);
  };

  const progressFor = (contributed: number, target: number) =>
    target > 0 ? Math.min(100, (contributed / target) * 100) : 0;

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;

    const payload = {
      name: goalName,
      targetAmount: toPaise(Number(goalTarget)),
      icon: goalIcon,
      color: goalColor,
      targetDate: goalTargetDate ? goalTargetDate.toISOString() : null,
    };
    const editId = editingGoalId;
    const prev = goals;

    // Close the form immediately — the change is reflected optimistically.
    setNewGoalOpen(false);
    resetGoalForm();

    await runOptimistic({
      apply: () => {
        let next: GoalWithProgress[];
        if (editId) {
          next = prev.map((g) =>
            g._id === editId
              ? {
                  ...g,
                  name: payload.name,
                  targetAmount: payload.targetAmount,
                  icon: payload.icon,
                  color: payload.color,
                  targetDate: payload.targetDate,
                  progressPercentage: progressFor(g.totalContributed, payload.targetAmount),
                }
              : g
          );
        } else {
          const tempGoal: GoalWithProgress = {
            _id: `temp-${Date.now()}`,
            name: payload.name,
            targetAmount: payload.targetAmount,
            icon: payload.icon,
            color: payload.color,
            targetDate: payload.targetDate,
            createdAt: new Date().toISOString(),
            totalContributed: 0,
            progressPercentage: 0,
            contributionCount: 0,
            lastContributedAt: null,
          };
          next = [tempGoal, ...prev];
        }
        setGoals(next);
        updateGoalsCache(next);
      },
      rollback: () => {
        setGoals(prev);
        updateGoalsCache(prev);
      },
      action: () => (editId ? updateGoal(editId, payload) : createGoal(payload)),
      onSuccess: () => {
        toast.success(editId ? "Goal updated successfully!" : "Goal created successfully!");
        fetchData(); // reconcile temp id + canonical fields
      },
      onError: (msg) => toast.error(msg),
    });
  };

  const handleFundGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !fundAmount) return;

    const goalId = selectedGoalId;
    const amount = toPaise(Number(fundAmount));
    const prev = goals;

    setFundGoalOpen(false);
    setFundAmount("");

    await runOptimistic({
      apply: () => {
        const next = prev.map((g) => {
          if (g._id !== goalId) return g;
          const totalContributed = g.totalContributed + amount;
          return {
            ...g,
            totalContributed,
            progressPercentage: progressFor(totalContributed, g.targetAmount),
            contributionCount: g.contributionCount + 1,
            lastContributedAt: new Date().toISOString(),
          };
        });
        setGoals(next);
        updateGoalsCache(next);
      },
      rollback: () => {
        setGoals(prev);
        updateGoalsCache(prev);
      },
      action: () => addGoalContribution(goalId, amount, new Date().toISOString()),
      onSuccess: () => {
        toast.success("Funds added to goal!");
        setDashboardDirty(true);
        fetchData();
      },
      onError: (msg) => toast.error(msg),
    });
  };

  const loadHistory = useCallback(async (goalId: string) => {
    setHistoryLoading(true);
    try {
      const data = await getGoalContributions(goalId);
      setContributions(data);
    } catch (err) {
      console.error("Failed to fetch contributions", err);
      toast.error("Failed to load contribution history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleOpenHistory = (goal: GoalWithProgress) => {
    setHistoryGoal(goal);
    setContributions([]);
    setHistoryOpen(true);
    loadHistory(goal._id);
  };

  const handleDeleteContribution = async (contributionId: string) => {
    const prevContribs = contributions;
    const prevGoals = goals;
    const removed = prevContribs.find((c) => c._id === contributionId);
    const goalId = historyGoal?._id;

    await runOptimistic({
      apply: () => {
        setContributions(prevContribs.filter((c) => c._id !== contributionId));
        if (removed && goalId) {
          const next = prevGoals.map((g) => {
            if (g._id !== goalId) return g;
            const totalContributed = Math.max(0, g.totalContributed - removed.amount);
            return {
              ...g,
              totalContributed,
              progressPercentage: progressFor(totalContributed, g.targetAmount),
              contributionCount: Math.max(0, g.contributionCount - 1),
            };
          });
          setGoals(next);
          updateGoalsCache(next);
        }
      },
      rollback: () => {
        setContributions(prevContribs);
        setGoals(prevGoals);
        updateGoalsCache(prevGoals);
      },
      action: () => deleteGoalContribution(contributionId),
      onSuccess: () => {
        toast.success("Contribution removed");
        setDashboardDirty(true);
        fetchData();
      },
      onError: (msg) => toast.error(msg),
    });
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal? All tracked contributions will be lost.")) return;
    const prev = goals;

    await runOptimistic({
      apply: () => {
        const next = prev.filter((g) => g._id !== id);
        setGoals(next);
        updateGoalsCache(next);
      },
      rollback: () => {
        setGoals(prev);
        updateGoalsCache(prev);
      },
      action: () => deleteGoal(id),
      onSuccess: () => {
        toast.success("Goal deleted");
        setDashboardDirty(true);
      },
      onError: (msg) => toast.error(msg),
    });
  };

  const colors = [
    "hsl(217, 91%, 60%)", // Blue
    "hsl(142, 72%, 29%)", // Green
    "hsl(325, 90%, 50%)", // Pink
    "hsl(25, 95%, 53%)",  // Orange
    "hsl(271, 91%, 65%)", // Purple
    "hsl(0, 84%, 60%)",   // Red
  ];

  const goalIcons = ["Target", "PiggyBank", "Car", "Home", "Laptop", "Plane", "Bike", "Gem", "GraduationCap", "Palmtree"];

  // Keep the dialog's "Total saved" in sync with the live list — after a delete
  // the snapshot on historyGoal is stale, so sum the loaded contributions once
  // they're available (fall back to the snapshot only while first loading).
  const historyTotalSaved =
    historyLoading ? historyGoal?.totalContributed ?? 0
      : contributions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Savings Goals"
        description="Plan for the future by allocating funds towards specific milestones"
        action={
          <Button size="sm" className="gap-1.5 cursor-pointer" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" /> Create New Goal
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 bg-muted/20 animate-pulse rounded-2xl border border-border/10" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl bg-muted/5 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-foreground">No Goals Configured</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Setting targets like an emergency fund or saving for a holiday helps you stay disciplined.
          </p>
          <Button className="mt-4 gap-1.5" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" /> Create Your First Goal
          </Button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {goals.map((goal) => {
            const isCompleted = goal.progressPercentage >= 100;
            // Cached goals persisted by an older version may lack these fields.
            const contributionCount = goal.contributionCount ?? 0;
            const dueDays = goal.targetDate ? daysUntil(goal.targetDate) : null;
            const isOverdue = dueDays !== null && dueDays < 0 && !isCompleted;
            return (
              <motion.div key={goal._id} variants={itemVariants}>
                <Card className="relative shadow-sm border-border/50 group transition-all duration-300 hover:border-foreground/25 hover:shadow-md flex flex-col justify-between overflow-hidden h-full">
                {/* Visual Accent Bar */}
                <div 
                  className="h-1.5 w-full absolute top-0 left-0" 
                  style={{ backgroundColor: goal.color || "hsl(217, 91%, 60%)" }}
                />
                
                <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => handleOpenEdit(goal)}
                    aria-label="Edit goal"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-rose-500 cursor-pointer"
                    onClick={() => handleDeleteGoal(goal._id)}
                    aria-label="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <CardContent className="p-5 pt-6 flex-1 flex flex-col justify-between gap-6">
                  {/* Goal Header */}
                  <div className="flex items-center gap-3">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center bg-muted/60"
                      style={{ color: goal.color || "hsl(217, 91%, 60%)" }}
                    >
                      <CategoryIcon name={goal.icon} className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm leading-none pr-6 text-foreground">{goal.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Target: <span className="font-bold text-foreground">{formatCurrency(goal.targetAmount)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Goal Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono font-semibold">
                      <span className="text-foreground">{formatCurrency(goal.totalContributed)}</span>
                      <span className="text-muted-foreground">{goal.progressPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={goal.progressPercentage} 
                      className="h-2" 
                      style={{ 
                        "--primary": goal.color 
                      } as React.CSSProperties}
                    />
                    
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-emerald-500 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Goal Achieved!
                        </span>
                      ) : (
                        <span>{formatCurrency(goal.targetAmount - goal.totalContributed)} remaining</span>
                      )}
                      {goal.targetDate ? (
                        <span
                          className={cn(
                            "flex items-center gap-1 font-semibold",
                            isCompleted
                              ? "text-muted-foreground"
                              : isOverdue
                              ? "text-rose-500"
                              : dueDays !== null && dueDays <= 7
                              ? "text-amber-500"
                              : "text-muted-foreground"
                          )}
                          title={`Target: ${new Date(goal.targetDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`}
                        >
                          <CalendarClock className="w-3 h-3" />
                          {isCompleted
                            ? new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : isOverdue
                            ? `Overdue ${Math.abs(dueDays as number)}d`
                            : dueDays === 0
                            ? "Due today"
                            : `${dueDays}d left`}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 font-medium">
                          <Calendar className="w-3 h-3" /> Created {new Date(goal.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>

                    {/* Contribution summary */}
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/40 pt-2 mt-0.5">
                      {contributionCount > 0 && goal.lastContributedAt ? (
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          Last funded {formatDate(goal.lastContributedAt)}
                        </span>
                      ) : (
                        <span className="italic">No contributions yet</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(goal)}
                        disabled={contributionCount === 0}
                        className="flex items-center gap-0.5 font-medium hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <History className="w-3 h-3" />
                        {contributionCount} {contributionCount === 1 ? "entry" : "entries"}
                      </button>
                    </div>
                  </div>

                  {/* Fund Button */}
                  <Button
                    variant={isCompleted ? "secondary" : "default"}
                    size="sm"
                    className="w-full gap-1.5 cursor-pointer font-semibold shadow-xs"
                    disabled={isCompleted}
                    onClick={() => { setSelectedGoalId(goal._id); setFundGoalOpen(true); }}
                  >
                    <Coins className="w-3.5 h-3.5" /> {isCompleted ? "Goal Completed" : "Contribute Funds"}
                  </Button>
                </CardContent>
              </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* New Goal Modal */}
      <Dialog open={newGoalOpen} onOpenChange={(o) => { setNewGoalOpen(o); if (!o) resetGoalForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoalId ? "Edit Goal" : "Create Financial Goal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveGoal} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input required placeholder="e.g., Emergency Fund, New Bike, Laptop" value={goalName} onChange={e => setGoalName(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Target Amount (₹)</Label>
              <Input required type="number" step="1" placeholder="50000" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Select Icon</Label>
              <div className="flex flex-wrap gap-2 p-2 bg-muted/30 border border-border/40 rounded-xl justify-center">
                {goalIcons.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setGoalIcon(name)}
                    aria-label={name}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                      goalIcon === name ? "bg-primary text-primary-foreground scale-110 shadow-xs" : "hover:bg-muted"
                    )}
                  >
                    <CategoryIcon name={name} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color Picker */}
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2.5 justify-center p-2.5 bg-muted/30 border border-border/40 rounded-xl">
                {colors.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setGoalColor(col)}
                    className={cn(
                      "w-6 h-6 rounded-full border border-white/20 transition-all cursor-pointer flex items-center justify-center shrink-0",
                      goalColor === col ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    )}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <Label>Target Date (optional)</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker
                    date={goalTargetDate}
                    onSelect={setGoalTargetDate}
                    placeholder="No deadline"
                  />
                </div>
                {goalTargetDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground cursor-pointer"
                    onClick={() => setGoalTargetDate(undefined)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full cursor-pointer font-bold">{editingGoalId ? "Update Goal" : "Create Goal"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fund Goal Modal */}
      <Dialog open={fundGoalOpen} onOpenChange={setFundGoalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Funds to Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFundGoal} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Contribution Amount (₹)</Label>
              <Input required type="number" step="0.01" placeholder="1000.00" value={fundAmount} onChange={e => setFundAmount(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {"Recording this contribution will subtract it from your cash flow balances and log it under the 'Investments & Savings' bucket in your monthly financial health score analyses."}
            </p>
            <Button type="submit" className="w-full cursor-pointer font-bold">Record Contribution</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {historyGoal && <span className="text-lg">{historyGoal.icon}</span>}
              {historyGoal?.name} · Contributions
            </DialogTitle>
          </DialogHeader>

          {historyGoal && (
            <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/40 px-4 py-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total saved</p>
                <p className="font-bold text-foreground">{formatCurrency(historyTotalSaved)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="font-bold text-foreground">{formatCurrency(historyGoal.targetAmount)}</p>
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            {historyLoading ? (
              <div className="space-y-2 py-1">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 bg-muted/20 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No contributions recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {contributions.map((c) => (
                  <li key={c._id} className="flex items-center justify-between py-2.5 group/item">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <Coins className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(c.amount)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(c.date)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-rose-500 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => handleDeleteContribution(c._id)}
                      aria-label="Delete contribution"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
