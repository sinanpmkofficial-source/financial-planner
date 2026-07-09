"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  confirmRecurringPayment,
  setRecurringActive,
} from "@/actions/recurring-expense";
import { getUserSettings } from "@/actions/settings";
import { formatCurrency } from "@/lib/format";
import { toPaise, toRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/shared/category-icon";
import {
  Plus,
  Repeat,
  Pencil,
  Trash2,
  CheckCircle2,
  Play,
  Pause,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TAGS = ["Needs", "Wants", "Investments", "Unnecessary Spending"] as const;
const FREQUENCIES = ["weekly", "monthly", "yearly"] as const;

type Tag = (typeof TAGS)[number];
type Frequency = (typeof FREQUENCIES)[number];

interface RecurringExpense {
  _id: string;
  amount: number;
  category: string;
  tag: Tag;
  note?: string;
  frequency: Frequency;
  nextDueDate: string;
  isActive: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 90, damping: 15 },
  },
} as const;

function dueMeta(nextDueDate: string) {
  const due = new Date(nextDueDate);
  const today = new Date();
  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOverdue = diffDays < 0;
  const isDueSoon = !isOverdue && diffDays <= 3;
  const label = isOverdue
    ? `Overdue by ${Math.abs(diffDays)}d`
    : diffDays === 0
    ? "Due today"
    : `Due in ${diffDays}d`;
  return { isOverdue, isDueSoon, label };
}

export function RecurringClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<
    { name: string; icon: string; color: string }[]
  >([]);

  // Dialog + form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState<Tag>("Needs");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextDueDate, setNextDueDate] = useState<Date | undefined>(new Date());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [recs, settings] = await Promise.all([
        getRecurringExpenses(),
        getUserSettings(),
      ]);
      setItems(recs || []);
      setCategories(settings.categories || []);
    } catch (err) {
      console.error("Failed to load recurring payments", err);
      toast.error("Failed to load recurring payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const monthlyEquivalent = useMemo(() => {
    // Normalise every active template to a rough monthly cost for the summary.
    return items
      .filter((i) => i.isActive)
      .reduce((sum, i) => {
        if (i.frequency === "weekly") return sum + (i.amount * 52) / 12;
        if (i.frequency === "yearly") return sum + i.amount / 12;
        return sum + i.amount;
      }, 0);
  }, [items]);

  const resetForm = () => {
    setEditingId(null);
    setAmount("");
    setCategory("");
    setTag("Needs");
    setFrequency("monthly");
    setNextDueDate(new Date());
    setNote("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleOpenEdit = (item: RecurringExpense) => {
    setEditingId(item._id);
    setAmount(String(toRupees(item.amount)));
    setCategory(item.category);
    setTag(item.tag);
    setFrequency(item.frequency);
    setNextDueDate(new Date(item.nextDueDate));
    setNote(item.note || "");
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !nextDueDate) {
      toast.error("Amount, category and due date are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        amount: toPaise(Number(amount)),
        category,
        tag,
        note,
        frequency,
      };
      const res = editingId
        ? await updateRecurringExpense(editingId, {
            ...payload,
            nextDueDate: nextDueDate.toISOString(),
          })
        : await createRecurringExpense({
            ...payload,
            nextDueDate: nextDueDate.toISOString(),
          });

      if (res.success) {
        toast.success(editingId ? "Recurring payment updated" : "Recurring payment added");
        setFormOpen(false);
        resetForm();
        fetchData();
      } else {
        toast.error(res.error || "Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    const toastId = toast.loading("Logging payment...");
    const res = await confirmRecurringPayment(id);
    if (res.success) {
      toast.success("Payment logged as an expense", { id: toastId });
      fetchData();
    } else {
      toast.error(res.error || "Failed to log payment", { id: toastId });
    }
  };

  const handleToggle = async (item: RecurringExpense) => {
    const next = !item.isActive;
    // Optimistic flip so the switch feels instant.
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, isActive: next } : i))
    );
    const res = await setRecurringActive(item._id, next);
    if (!res.success) {
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, isActive: item.isActive } : i))
      );
      toast.error(res.error || "Failed to update");
    } else {
      toast.success(next ? "Resumed" : "Paused");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring payment? This cannot be undone.")) return;
    const prev = items;
    setItems((p) => p.filter((i) => i._id !== id));
    const res = await deleteRecurringExpense(id);
    if (res.success) {
      toast.success("Recurring payment deleted");
    } else {
      setItems(prev);
      toast.error(res.error || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Recurring Payments"
        description="Track subscriptions and bills, then log each one when it's paid"
        action={
          <Button size="sm" className="gap-1.5 cursor-pointer" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" /> New Recurring Payment
          </Button>
        }
      />

      {/* Summary bar */}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Estimated Monthly Commitment
            </p>
            <p className="text-2xl font-extrabold text-foreground">
              {formatCurrency(monthlyEquivalent)}
              <span className="text-xs font-medium text-muted-foreground">/mo</span>
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active
            </p>
            <p className="text-2xl font-extrabold text-foreground">
              {items.filter((i) => i.isActive).length}
              <span className="text-xs font-medium text-muted-foreground">
                {" "}
                / {items.length}
              </span>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-40 bg-muted/20 animate-pulse rounded-2xl border border-border/10"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl bg-muted/5 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-foreground">No Recurring Payments</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Add subscriptions and bills like rent or streaming services to get
            reminders and log them in one tap.
          </p>
          <Button className="mt-4 gap-1.5" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" /> Add Your First One
          </Button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => {
            const { isOverdue, isDueSoon, label } = dueMeta(item.nextDueDate);
            const catIcon =
              categories.find(
                (c) => c.name.toLowerCase() === item.category.toLowerCase()
              )?.icon ?? "Tag";
            return (
              <motion.div key={item._id} variants={itemVariants}>
                <div
                  className={cn(
                    "relative flex flex-col justify-between h-full rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-md",
                    item.isActive ? "border-border/60" : "border-border/40 opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-11 h-11 rounded-xl flex items-center justify-center bg-muted/60 text-foreground shrink-0">
                        <CategoryIcon name={catIcon} className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {item.category}
                        </h4>
                        <p className="text-lg font-extrabold text-foreground leading-tight">
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => handleOpenEdit(item)}
                        aria-label="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500 cursor-pointer"
                        onClick={() => handleDelete(item._id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {item.frequency}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {item.tag}
                    </span>
                    {item.isActive ? (
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto",
                          isOverdue
                            ? "bg-rose-500/10 text-rose-500"
                            : isDueSoon
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {label}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto bg-muted text-muted-foreground">
                        Paused
                      </span>
                    )}
                  </div>

                  {item.note && (
                    <p className="mt-2 text-xs text-muted-foreground truncate">
                      {item.note}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 cursor-pointer font-semibold"
                      disabled={!item.isActive}
                      onClick={() => handleConfirm(item._id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Log Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 cursor-pointer"
                      onClick={() => handleToggle(item)}
                    >
                      {item.isActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Resume
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create / Edit Modal */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Recurring Payment" : "New Recurring Payment"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                required
                type="number"
                step="0.01"
                placeholder="999.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon name={c.icon} className="w-4 h-4" />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency((v as Frequency) || "monthly")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f} className="capitalize">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bucket</Label>
                <Select value={tag} onValueChange={(v) => setTag((v as Tag) || "Needs")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAGS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Next Due Date</Label>
              <DatePicker date={nextDueDate} onSelect={setNextDueDate} />
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g. Netflix, Rent"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer font-bold"
              disabled={saving}
            >
              {editingId ? "Save Changes" : "Add Recurring Payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
