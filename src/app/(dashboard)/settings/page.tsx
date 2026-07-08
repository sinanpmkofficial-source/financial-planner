"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { toast } from "sonner";
import { Plus, Pencil, Check, Info, Loader2 } from "lucide-react";
import {
  getUserSettings,
  updateUserSettings,
  addCategory,
  updateCategory,
  deleteCategory,
} from "@/actions/settings";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/shared/category-icon";

interface Category {
  name: string;
  icon: string;
  color: string;
  bucket?: "Needs" | "Fun" | "Investments" | "Other";
}

interface UserSettings {
  budgetStartDay: number;
  showGamification: boolean;
  categories: Category[];
}

// Lucide icon names offered when creating/editing a category.
const ICON_PRESETS = [
  "Utensils", "Car", "Home", "ShoppingBag", "Zap", "HeartPulse",
  "GraduationCap", "Gamepad2", "Plane", "Film", "Wine", "Dumbbell",
  "Coffee", "Gift", "Laptop", "Music", "Pill", "Bus",
  "Fuel", "Shirt", "Smartphone", "Wifi", "CreditCard", "PiggyBank",
  "Wallet", "Receipt", "Briefcase", "Book", "Dog", "Cat",
  "Baby", "Wrench", "Scissors", "Camera", "Bike", "Package",
  "Tag", "FolderOpen",
];

const DEFAULT_ICON = "Tag";

const COLOR_PRESETS = [
  { name: "Emerald", value: "hsl(142, 72%, 29%)" },
  { name: "Blue", value: "hsl(217, 91%, 60%)" },
  { name: "Orange", value: "hsl(25, 95%, 53%)" },
  { name: "Rose", value: "hsl(350, 89%, 60%)" },
  { name: "Amber", value: "hsl(43, 96%, 50%)" },
  { name: "Violet", value: "hsl(271, 91%, 65%)" },
  { name: "Cyan", value: "hsl(188, 86%, 53%)" },
  { name: "Slate", value: "hsl(200, 15%, 50%)" }
];

function hslToHex(hslStr: string): string {
  if (hslStr.startsWith("#")) return hslStr;
  const match = hslStr.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);
  if (!match) return "#000000";
  const h = parseInt(match[1]);
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSuccess: () => void;
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryDialogProps) {
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState(DEFAULT_ICON);
  const [catColor, setCatColor] = useState("hsl(200, 15%, 50%)");
  const [catBucket, setCatBucket] = useState<"Needs" | "Fun" | "Investments" | "Other">("Other");
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    if (open) {
      if (category) {
        setCatName(category.name);
        setCatIcon(category.icon);
        setCatColor(category.color);
        setCatBucket(category.bucket || "Other");
      } else {
        setCatName("");
        setCatIcon(DEFAULT_ICON);
        setCatColor("hsl(200, 15%, 50%)");
        setCatBucket("Other");
      }
    }
  }, [open, category]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSavingCategory(true);
    try {
      let res;
      if (category) {
        res = await updateCategory(category.name, {
          name: catName.trim(),
          icon: catIcon,
          color: catColor,
          bucket: catBucket,
        });
      } else {
        res = await addCategory({
          name: catName.trim(),
          icon: catIcon,
          color: catColor,
          bucket: catBucket,
        });
      }

      if (res.success) {
        toast.success(category ? "Category updated" : "Category added");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.error || "Operation failed");
      }
    } catch {
      toast.error("An error occurred while saving category");
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Custom Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSaveCategory} className="contents">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="cat-name">Category Name</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Subscriptions, Gifts"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              disabled={category?.name?.toLowerCase() === "other"}
            />
            {category?.name?.toLowerCase() === "other" && (
              <p className="text-[11px] text-amber-600">
                The default &quot;Other&quot; category cannot be renamed.
              </p>
            )}
          </div>

          {/* Icon picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5 p-2 bg-muted/30 border border-border/40 rounded-xl max-h-44 overflow-y-auto scrollbar-none">
              {ICON_PRESETS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setCatIcon(ic)}
                  aria-label={ic}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-lg transition-all cursor-pointer",
                    catIcon === ic
                      ? "bg-primary text-primary-foreground scale-105 shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <CategoryIcon name={ic} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Colour picker */}
          <div className="space-y-2">
            <Label>Accent Colour</Label>
            <div className="flex flex-wrap gap-2 p-2 bg-muted/30 border border-border/40 rounded-xl">
              {COLOR_PRESETS.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  onClick={() => setCatColor(col.value)}
                  aria-label={col.name}
                  style={{ backgroundColor: col.value }}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all cursor-pointer shrink-0",
                    catColor === col.value
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Financial bucket mapping */}
          <div className="space-y-2">
            <Label>Financial Bucket</Label>
            <select
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={catBucket}
              onChange={(e) => setCatBucket(e.target.value as any)}
            >
              <option value="Needs">Needs (Survival)</option>
              <option value="Fun">Fun (Lifestyle)</option>
              <option value="Investments">Investments</option>
              <option value="Other">Other / Uncategorized</option>
            </select>
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-2.5 pt-1">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `color-mix(in oklab, ${catColor} 18%, transparent)`, color: catColor }}
            >
              <CategoryIcon name={catIcon} className="w-4 h-4" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {catName.trim() || "Category preview"}
            </span>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingCategory} className="w-full sm:w-auto cursor-pointer flex items-center justify-center">
              {savingCategory ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : category ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface GeneralPreferencesFormProps {
  initialBudgetStartDay: number;
  onSuccess: () => void;
}

function GeneralPreferencesForm({
  initialBudgetStartDay,
  onSuccess,
}: GeneralPreferencesFormProps) {
  const [budgetStartDay, setBudgetStartDay] = useState<number>(initialBudgetStartDay);
  const [savingGeneral, setSavingGeneral] = useState(false);

  useEffect(() => {
    setBudgetStartDay(initialBudgetStartDay);
  }, [initialBudgetStartDay]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (budgetStartDay < 1 || budgetStartDay > 28) {
      toast.error("Budget start day must be between 1 and 28");
      return;
    }
    setSavingGeneral(true);
    try {
      const res = await updateUserSettings({
        budgetStartDay,
      });
      if (res.success) {
        toast.success("Settings updated successfully");
        onSuccess();
      } else {
        toast.error(res.error || "Failed to save settings");
      }
    } catch {
      toast.error("An error occurred while saving settings");
    } finally {
      setSavingGeneral(false);
    }
  };

  return (
    <form onSubmit={handleSaveGeneral} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">General configuration</CardTitle>
            <CardDescription>
              Adjust cycles, currencies, and display features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Currency Symbol - LOCKED TO INR */}
            <div className="space-y-2">
              <Label htmlFor="currency-display">Base Currency</Label>
              <div className="relative">
                <Input
                  id="currency-display"
                  value="Indian Rupee (₹)"
                  disabled
                  className="bg-muted/50 text-muted-foreground pr-10"
                />
                <Check className="absolute right-3 top-2.5 w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-muted-foreground">
                Locked to INR (₹) per system configuration.
              </p>
            </div>

            {/* Budget Start Day */}
            <div className="space-y-2">
              <Label htmlFor="budget-day">Budget Cycle Start Day</Label>
              <Input
                id="budget-day"
                type="number"
                min={1}
                max={28}
                value={budgetStartDay}
                onChange={(e) => setBudgetStartDay(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Set this to your salary credit date to sync monthly budget periods. (1 to 28)
              </p>
            </div>



            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={savingGeneral} className="flex items-center justify-center">
                {savingGeneral ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information / Help Card */}
        <Card className="border border-border/50 shadow-sm bg-muted/10">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              System Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong>Cycle Syncing:</strong> Adjusting the Budget Cycle Start Day updates how reports and budgets compute their monthly start date. Selecting the day your salary arrives helps map your true cash flow period.
            </p>
            <p>
              <strong>Dynamic Renaming:</strong> Modifying a category&apos;s name updates all historical transactions automatically. Deleting a category keeps the transactions but reassigns them to <em>Other</em> so you never lose historical expense data.
            </p>

          </CardContent>
        </Card>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Category modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const loadSettings = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const s = await getUserSettings();
      setSettings(s);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings(true);
  }, []);

  const openAddCategory = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleDeleteCategory = async (name: string) => {
    try {
      const res = await deleteCategory(name);
      if (res.success) {
        toast.success("Category deleted");
        await loadSettings();
      } else {
        toast.error(res.error || "Failed to delete category");
      }
    } catch {
      toast.error("Failed to delete category");
    }
  };

  if (loading && !settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Loading your preferences..." />
        <div className="w-48 h-9 bg-muted animate-pulse rounded-lg" />
        <div className="p-6 rounded-xl border border-border/10 bg-card animate-pulse space-y-4 shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted rounded-sm" />
              <div className="h-3.5 w-64 bg-muted rounded-sm" />
            </div>
            <div className="h-9 w-28 bg-muted rounded-lg" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/5 bg-muted/20 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-16 bg-muted rounded-sm" />
                    <div className="h-2 w-12 bg-muted rounded-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Customize categories, budget parameters, and visual settings"
      />

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="general">General Preferences</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4 outline-none">
          <Card className="border border-border/50 shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="text-lg font-semibold">Expense Categories</CardTitle>
                <CardDescription>
                  Manage categories used for grouping expenses and setting budgets
                </CardDescription>
              </div>
              <Button onClick={openAddCategory} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {settings?.categories?.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shadow-xs border border-border"
                        style={{ backgroundColor: `color-mix(in oklab, ${cat.color} 15%, transparent)`, color: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{cat.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => openEditCategory(cat)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {cat.name.toLowerCase() !== "other" && (
                        <ConfirmDelete
                          title="Delete Category?"
                          description={`Delete "${cat.name}"? All associated transactions will be moved to "Other", and any associated budget limit will be deleted.`}
                          onConfirm={() => handleDeleteCategory(cat.name)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Preferences Tab */}
        <TabsContent value="general" className="outline-none">
          <GeneralPreferencesForm
            initialBudgetStartDay={settings?.budgetStartDay || 1}
            onSuccess={() => loadSettings(false)}
          />
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <CategoryDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        category={editingCategory}
        onSuccess={() => loadSettings(false)}
      />
    </div>
  );
}
