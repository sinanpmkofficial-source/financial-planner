"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback } from "react";
import { getGoalsWithProgress, createGoal, updateGoal, addGoalContribution, deleteGoal } from "@/actions/goals";
import { formatCurrency } from "@/lib/format";
import { toPaise, toRupees } from "@/lib/money";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Coins, Trash2, Calendar, CheckCircle2, Pencil } from "lucide-react";
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
  createdAt: string;
  totalContributed: number;
  progressPercentage: number;
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

  // Form states
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalIcon, setGoalIcon] = useState("🎯");
  const [goalColor, setGoalColor] = useState("hsl(217, 91%, 60%)");
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
    setGoalIcon("🎯");
    setGoalColor("hsl(217, 91%, 60%)");
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
    setGoalIcon(goal.icon || "🎯");
    setGoalColor(goal.color || "hsl(217, 91%, 60%)");
    setNewGoalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;

    const payload = {
      name: goalName,
      targetAmount: toPaise(Number(goalTarget)),
      icon: goalIcon,
      color: goalColor,
    };
    const res = editingGoalId
      ? await updateGoal(editingGoalId, payload)
      : await createGoal(payload);

    if (res.success) {
      toast.success(editingGoalId ? "Goal updated successfully!" : "Goal created successfully!");
      setNewGoalOpen(false);
      resetGoalForm();
      fetchData();
    } else {
      toast.error(res.error);
    }
  };

  const handleFundGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !fundAmount) return;

    const res = await addGoalContribution(selectedGoalId, toPaise(Number(fundAmount)), new Date().toISOString());
    if (res.success) {
      toast.success("Funds added to goal!");
      setDashboardDirty(true);
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

  const colors = [
    "hsl(217, 91%, 60%)", // Blue
    "hsl(142, 72%, 29%)", // Green
    "hsl(325, 90%, 50%)", // Pink
    "hsl(25, 95%, 53%)",  // Orange
    "hsl(271, 91%, 65%)", // Purple
    "hsl(0, 84%, 60%)",   // Red
  ];

  const emojis = ["🎯", "💰", "🚗", "🏠", "💻", "✈️", "🏍️", "💍", "📚", "🏖️"];

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
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl mb-4">
            🎯
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
            return (
              <motion.div key={goal._id} variants={itemVariants}>
                <Card className="relative shadow-sm border-border/50 group transition-all duration-300 hover:border-foreground/25 hover:shadow-md flex flex-col justify-between overflow-hidden h-full">
                {/* Visual Accent Bar */}
                <div 
                  className="h-1.5 w-full absolute top-0 left-0" 
                  style={{ backgroundColor: goal.color || "hsl(217, 91%, 60%)" }}
                />
                
                <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      className="text-2xl w-11 h-11 rounded-xl flex items-center justify-center bg-muted/60"
                    >
                      {goal.icon}
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
                      <span className="flex items-center gap-0.5 font-medium">
                        <Calendar className="w-3 h-3" /> Created {new Date(goal.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
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

            {/* Custom Emoji Picker */}
            <div className="space-y-2">
              <Label>Select Icon</Label>
              <div className="flex flex-wrap gap-2 p-2 bg-muted/30 border border-border/40 rounded-xl justify-center">
                {emojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setGoalIcon(em)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer",
                      goalIcon === em ? "bg-primary text-primary-foreground scale-110 shadow-xs" : "hover:bg-muted"
                    )}
                  >
                    {em}
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
    </div>
  );
}
