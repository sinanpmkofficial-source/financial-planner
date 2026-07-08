"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getBorrowLendRecords,
  deleteBorrowLend,
  settleBorrowLend,
} from "@/actions/borrow-lend";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/header";
import { BorrowLendForm } from "@/components/borrow-lend/borrow-lend-form";
import { RepaymentDialog } from "@/components/borrow-lend/repayment-dialog";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Plus,
  HandCoins,
  Pencil,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Banknote,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import type { BorrowLend } from "@/types";
import { useUIStore } from "@/stores/ui-store";

export function BorrowLendClient() {
  const { setDashboardDirty, borrowLendCache, updateBorrowLendCache } = useUIStore();
  const [records, setRecords] = useState<BorrowLend[]>([]);

  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BorrowLend | undefined>();
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayRecord, setRepayRecord] = useState<BorrowLend | null>(null);

  // Compute summary metrics on the client side
  const summary = useMemo(() => {
    let owedByMe = 0;       // I borrowed — still pending remaining
    let owedToMe = 0;       // I lent — still pending remaining
    let overduePayments = 0;
    let overdueCollections = 0;
    const today = new Date();

    for (const r of records) {
      const paid = r.paidAmount ?? 0;
      const remaining = r.amount - paid;
      const isOverdue = r.dueDate && new Date(r.dueDate) < today && r.status === "pending";

      if (r.type === "borrowed" && r.status === "pending") {
        owedByMe += remaining;
        if (isOverdue) overduePayments += remaining;
      } else if (r.type === "lent" && r.status === "pending") {
        owedToMe += remaining;
        if (isOverdue) overdueCollections += remaining;
      }
    }

    return { owedByMe, owedToMe, overduePayments, overdueCollections };
  }, [records]);

  // Hydrate state from local cache on client mount
  useEffect(() => {
    if (borrowLendCache && borrowLendCache.length > 0) {
      setRecords(borrowLendCache);
      setLoading(false);
    }
  }, [borrowLendCache]);

  const fetchData = useCallback(async () => {
    const currentCache = useUIStore.getState().borrowLendCache;
    if (!currentCache || currentCache.length === 0) {
      setLoading(true);
    }
    try {
      const data = await getBorrowLendRecords();
      setRecords(data);
      updateBorrowLendCache(data);
    } catch (err) {
      console.error("Failed to fetch borrow/lend records", err);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [updateBorrowLendCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const result = await deleteBorrowLend(id);
    if (result.success) {
      toast.success("Record deleted");
      await fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleSettle = async (id: string) => {
    const result = await settleBorrowLend(id);
    if (result.success) {
      toast.success("Marked as settled");
      await fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = (record: BorrowLend) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleOpenRepay = (record: BorrowLend) => {
    setRepayRecord(record);
    setRepayOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingRecord(undefined);
  };

  const borrowed = records.filter((r) => r.type === "borrowed");
  const lent = records.filter((r) => r.type === "lent");

  const renderList = (items: BorrowLend[]) => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={HandCoins}
          title="No records"
          description="No borrow/lend records to show."
          actionLabel="Add Record"
          onAction={() => setFormOpen(true)}
        />
      );
    }

    return (
      <div className="space-y-2">
        {items.map((record) => {
          const paid = record.paidAmount ?? 0;
          const remaining = record.amount - paid;
          
          return (
            <Card
              key={record._id}
              className={cn(
                "border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-[0_4px_12px_oklch(0_0_0/8%)] dark:hover:shadow-[0_4px_14px_oklch(0_0_0/40%)]"
              )}
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Details section */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5",
                        record.type === "borrowed"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {record.type === "borrowed" ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {record.personName}
                        </p>
                        <Badge
                          variant={
                            record.status === "settled"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0"
                        >
                          {record.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(record.date)}
                        </p>
                        {record.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            · Due: {formatDate(record.dueDate)}
                          </p>
                        )}
                      </div>
                      {record.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {record.notes}
                        </p>
                      )}
                      {paid > 0 && (
                        <div className="mt-2.5 space-y-1 max-w-[240px]">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                            <span>Paid: {formatCurrency(paid)}</span>
                            <span>{Math.round((paid / record.amount) * 100)}%</span>
                          </div>
                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-foreground" style={{ width: `${(paid / record.amount) * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Price Section */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t border-border/20 sm:border-t-0">
                    <div className="text-left sm:text-right flex flex-col">
                      <span
                        className={`text-sm sm:text-base font-extrabold ${
                          record.type === "borrowed"
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(record.amount)}
                      </span>
                      {paid > 0 && record.status === "pending" && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Due: {formatCurrency(remaining)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {record.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-foreground hover:bg-muted rounded-full shrink-0"
                            onClick={() => handleOpenRepay(record)}
                            title={record.type === "borrowed" ? "Pay Back Amount" : "Collect Payment"}
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </Button>
                          <ConfirmAction
                            title="Settle Record?"
                            description={`Are you sure you want to fully settle this record with ${record.personName}? This will record a corresponding transaction.`}
                            confirmText="Settle"
                            confirmVariant="success"
                            onConfirm={() => handleSettle(record._id)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-full shrink-0 cursor-pointer"
                                title="Instant full settlement"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            }
                          />
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full shrink-0"
                        onClick={() => handleEdit(record)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <ConfirmDelete
                        onConfirm={() => handleDelete(record._id)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrow & Lend"
        description="Track money you've borrowed and lent"
        action={
          <Button onClick={() => setFormOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Record
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="I Owe"
          value={formatCurrency(summary.owedByMe)}
          icon={ArrowDownLeft}
          variant="danger"
          index="01"
          trend="pending borrowed remaining"
        />
        <StatCard
          label="Owed to Me"
          value={formatCurrency(summary.owedToMe)}
          icon={ArrowUpRight}
          variant="success"
          index="02"
          trend="pending lent remaining"
        />
        <StatCard
          label="Overdue Payments"
          value={formatCurrency(summary.overduePayments)}
          icon={Clock}
          variant="warning"
          index="03"
          trend={summary.overduePayments > 0 ? "past due date" : "all on time"}
        />
        <StatCard
          label="Overdue Collections"
          value={formatCurrency(summary.overdueCollections)}
          icon={Banknote}
          variant="default"
          index="04"
          trend={summary.overdueCollections > 0 ? "past due date" : "all on time"}
        />
      </div>

      {/* Tabs */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/20 bg-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-muted rounded-sm" />
                  <div className="h-3 w-16 bg-muted rounded-sm" />
                </div>
              </div>
              <div className="h-4 w-12 bg-muted rounded-sm" />
            </div>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="borrowed">
          <TabsList>
            <TabsTrigger value="borrowed">
              Borrowed ({borrowed.length})
            </TabsTrigger>
            <TabsTrigger value="lent">Lent ({lent.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="borrowed" className="mt-4">
            {renderList(borrowed)}
          </TabsContent>
          <TabsContent value="lent" className="mt-4">
            {renderList(lent)}
          </TabsContent>
        </Tabs>
      )}

      <BorrowLendForm
        open={formOpen}
        onOpenChange={handleFormClose}
        record={editingRecord}
        onSuccess={fetchData}
      />

      <RepaymentDialog
        open={repayOpen}
        onOpenChange={setRepayOpen}
        record={repayRecord}
        onSuccess={fetchData}
      />
    </div>
  );
}
