"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getExpensesByDateRange, deleteExpense } from "@/actions/expense";
import { getIncomesByDateRange, deleteIncome } from "@/actions/income";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_ICONS, type ExpenseCategory } from "@/constants";
import { PageHeader } from "@/components/layout/header";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/shared/category-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Receipt, Pencil, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Expense, Income } from "@/types";
import { getUserSettings } from "@/actions/settings";
import { runOptimistic } from "@/lib/optimistic";

type UnifiedTransaction = 
  | (Expense & { type: "expense" })
  | (Income & { type: "income" });

export function TransactionsClient() {
  const { dateRange, setDashboardDirty, expensesCache, incomesCache, updateExpensesCache, updateIncomesCache } = useUIStore();
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<{ name: string; icon: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Expense | Income | undefined>();
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const cacheKey = `${dateRange.from.toISOString()}_${dateRange.to.toISOString()}`;

  // Hydrate transactions state from local cache on mount / period change
  useEffect(() => {
    const cachedExpenses = expensesCache[cacheKey];
    const cachedIncomes = incomesCache[cacheKey];
    if (cachedExpenses) {
      setExpenses(cachedExpenses);
    }
    if (cachedIncomes) {
      setIncomes(cachedIncomes);
    }
    if (cachedExpenses || cachedIncomes) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [cacheKey, expensesCache, incomesCache]);

  const fetchData = useCallback(async () => {
    const currentExpCache = useUIStore.getState().expensesCache[cacheKey];
    const currentIncCache = useUIStore.getState().incomesCache[cacheKey];
    if (!currentExpCache && !currentIncCache) {
      setLoading(true);
    }
    try {
      const [expenseData, incomeData] = await Promise.all([
        getExpensesByDateRange(dateRange.from, dateRange.to),
        getIncomesByDateRange(dateRange.from, dateRange.to),
      ]);
      setExpenses(expenseData);
      setIncomes(incomeData);
      updateExpensesCache(cacheKey, expenseData);
      updateIncomesCache(cacheKey, incomeData);
    } catch (err) {
      console.error("Failed to fetch transaction data", err);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [dateRange, cacheKey, updateExpensesCache, updateIncomesCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getUserSettings().then((settings) => {
      setCategories(settings.categories || []);
    });
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setFormOpen(true);
    }
  }, [searchParams]);

  const catIconMap = useMemo(() => {
    return new Map(categories.map((c) => [c.name.toLowerCase(), c.icon]));
  }, [categories]);

  const catColorMap = useMemo(() => {
    return new Map(categories.map((c) => [c.name.toLowerCase(), c.color]));
  }, [categories]);

  const handleDelete = async (id: string, type: "expense" | "income") => {
    // Snapshot for rollback, then optimistically remove from state + cache.
    const prevExpenses = expenses;
    const prevIncomes = incomes;

    await runOptimistic({
      apply: () => {
        if (type === "expense") {
          const next = prevExpenses.filter((e) => e._id !== id);
          setExpenses(next);
          updateExpensesCache(cacheKey, next);
        } else {
          const next = prevIncomes.filter((i) => i._id !== id);
          setIncomes(next);
          updateIncomesCache(cacheKey, next);
        }
      },
      rollback: () => {
        setExpenses(prevExpenses);
        setIncomes(prevIncomes);
        updateExpensesCache(cacheKey, prevExpenses);
        updateIncomesCache(cacheKey, prevIncomes);
      },
      action: () => (type === "expense" ? deleteExpense(id) : deleteIncome(id)),
      onSuccess: () => {
        toast.success(`${type === "expense" ? "Expense" : "Income"} deleted`);
        setDashboardDirty(true);
      },
      onError: (msg) => toast.error(msg),
    });
  };

  const handleEdit = (transaction: Expense | Income) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingTransaction(undefined);
  };

  // Merge & filter transactions
  const mergedTransactions = useMemo(() => {
    const list: UnifiedTransaction[] = [
      ...expenses.map((e) => ({ ...e, type: "expense" as const })),
      ...incomes.map((i) => ({ ...i, type: "income" as const })),
    ];
    // Sort descending by date, fallback to createdAt timestamp
    return list.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeB - timeA;
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    });
  }, [expenses, incomes]);

  const filteredTransactions = useMemo(() => {
    return mergedTransactions.filter((t) => {
      // 1. Search Query filter (matches ANY data of a transaction)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const amountStr = t.amount.toString();
        const noteStr = (t.note || "").toLowerCase();
        const dateStr = formatDate(t.date).toLowerCase();
        const typeStr = t.type.toLowerCase();
        
        let match = false;
        if (t.type === "expense") {
          const categoryStr = t.category.toLowerCase();
          match = (
            categoryStr.includes(query) ||
            noteStr.includes(query) ||
            amountStr.includes(query) ||
            dateStr.includes(query) ||
            typeStr.includes(query)
          );
        } else {
          const sourceStr = t.source.toLowerCase();
          match = (
            sourceStr.includes(query) ||
            noteStr.includes(query) ||
            amountStr.includes(query) ||
            dateStr.includes(query) ||
            typeStr.includes(query)
          );
        }
        
        if (!match) return false;
        // Bypassing filterType and filterCategory filters if search is applied
        return true;
      }

      // 2. Regular filters (only if no search query is active)
      // Filter by type
      if (filterType === "expense" && t.type !== "expense") return false;
      if (filterType === "income" && t.type !== "income") return false;
      
      // Filter by category (expenses only)
      if (filterCategory !== "all") {
        if (t.type !== "expense" || t.category !== filterCategory) return false;
      }
      
      return true;
    });
  }, [mergedTransactions, searchQuery, filterType, filterCategory]);

  // Calculations for cards
  const summaryMetrics = useMemo(() => {
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netSavings = totalIncome - totalExpense;
    return { totalIncome, totalExpense, netSavings };
  }, [expenses, incomes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description={`${filteredTransactions.length} entries in selected period`}
        showMonthPicker
        titleAction={
          <Button
            onClick={() => setFormOpen(true)}
            size="icon"
            className="h-7 w-7 rounded-full cursor-pointer"
            aria-label="Add transaction"
            title="Add transaction"
          >
            <Plus className="w-4 h-4" />
          </Button>
        }
      />

      {/* Quick metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Income"
          value={`+${formatCurrency(summaryMetrics.totalIncome)}`}
          icon={TrendingUp}
          variant="success"
          index="01"
          className="animate-fade-in-up opacity-0"
        />
        <StatCard
          label="Total Expenses"
          value={`-${formatCurrency(summaryMetrics.totalExpense)}`}
          icon={TrendingDown}
          variant="danger"
          index="02"
          className="animate-fade-in-up opacity-0 animation-delay-75"
        />
        <StatCard
          label="Net Balance"
          value={`${summaryMetrics.netSavings >= 0 ? "+" : ""}${formatCurrency(summaryMetrics.netSavings)}`}
          icon={ArrowRight}
          variant="default"
          index="03"
          className="col-span-2 md:col-span-1 animate-fade-in-up opacity-0 animation-delay-150"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/25 backdrop-blur-md p-3 rounded-2xl border border-border">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search by category, source, note, amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full bg-background/50 border-border"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Type toggle buttons */}
          <div className="flex p-0.5 bg-muted rounded-lg border border-border/50">
            <button
              onClick={() => {
                setFilterType("all");
                setFilterCategory("all");
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                filterType === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                filterType === "expense"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Expenses
            </button>
            <button
              onClick={() => {
                setFilterType("income");
                setFilterCategory("all"); // Category filter is not relevant to Income
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                filterType === "income"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Income
            </button>
          </div>

          {/* Category filter dropdown - only visible for expenses/all */}
          {filterType !== "income" && (
            <div className="flex items-center gap-3">
              <Select value={filterCategory} onValueChange={(val) => val && setFilterCategory(val)}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      <span className="mr-2 inline-flex" style={{ color: c.color }}>
                        <CategoryIcon name={c.icon} className="w-4 h-4" />
                      </span>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/20 bg-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-muted animate-pulse rounded-sm" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded-sm" />
                </div>
              </div>
              <div className="h-4 w-12 bg-muted animate-pulse rounded-sm" />
            </div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions found"
          description="Try modifying your filters or date period, or record a new transaction."
          actionLabel="Add Transaction"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map((transaction) => {
            const isExp = transaction.type === "expense";
            const icon = isExp
              ? catIconMap.get(transaction.category.toLowerCase()) ?? CATEGORY_ICONS[transaction.category as ExpenseCategory] ?? "Tag"
              : "Wallet";
            const catColor = isExp ? catColorMap.get(transaction.category.toLowerCase()) : undefined;
            const label = isExp ? transaction.category : transaction.source;

            return (
              <Card
                key={transaction._id}
                className={cn(
                  "border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-[0_4px_12px_oklch(0_0_0/8%)] dark:hover:shadow-[0_4px_14px_oklch(0_0_0/40%)]"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center border border-border/10 shrink-0",
                          !isExp ? "text-emerald-500" : !catColor ? "text-muted-foreground" : ""
                        )}
                        style={isExp && catColor ? { color: catColor } : undefined}
                      >
                        <CategoryIcon name={icon} className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm leading-none">{label}</p>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                            {formatDate(transaction.date)}
                          </Badge>
                          <Badge
                            variant={isExp ? "outline" : "default"}
                            className={cn(
                              "text-[10px] py-0 px-1.5 h-4 font-semibold uppercase tracking-wider",
                              isExp 
                                ? "border-rose-50/30 text-rose-600 bg-rose-50/5 dark:bg-rose-500/10" 
                                : "bg-emerald-50/10 hover:bg-emerald-50/10 text-emerald-600 border-none"
                            )}
                          >
                            {transaction.type}
                          </Badge>
                        </div>
                        {transaction.note && (
                          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm line-clamp-1">
                            {transaction.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-sm font-bold mr-1.5",
                        isExp ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {isExp ? "-" : "+"}
                        {formatCurrency(transaction.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground cursor-pointer hover:bg-muted"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <ConfirmDelete
                        title={`Delete ${isExp ? "Expense" : "Income"}?`}
                        description="This transaction will be permanently removed. This action cannot be undone."
                        onConfirm={() => handleDelete(transaction._id, transaction.type)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        transaction={editingTransaction}
        defaultType={filterType === "income" ? "income" : "expense"}
        onSuccess={fetchData}
      />
    </div>
  );
}
