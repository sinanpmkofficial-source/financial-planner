"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getBorrowLendRecords,
  deleteBorrowLend,
  settleBorrowLend,
  getBorrowLendSummary,
} from "@/actions/borrow-lend";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/header";
import { BorrowLendForm } from "@/components/borrow-lend/borrow-lend-form";
import { RepaymentDialog } from "@/components/borrow-lend/repayment-dialog";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function BorrowLendClient() {
  const [records, setRecords] = useState<BorrowLend[]>([]);
  const [summary, setSummary] = useState({
    totalBorrowed: 0,
    totalLent: 0,
    pendingCollections: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BorrowLend | undefined>();
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayRecord, setRepayRecord] = useState<BorrowLend | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sum] = await Promise.all([
        getBorrowLendRecords(),
        getBorrowLendSummary(),
      ]);
      setRecords(data);
      setSummary(sum);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const result = await deleteBorrowLend(id);
    if (result.success) {
      toast.success("Record deleted");
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleSettle = async (id: string) => {
    const result = await settleBorrowLend(id);
    if (result.success) {
      toast.success("Marked as settled");
      fetchData();
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
              className="border border-border/50 shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {record.type === "borrowed" ? "🔴" : "🟢"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {record.personName}
                        </p>
                        <Badge
                          variant={
                            record.status === "settled"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {record.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {record.notes}
                        </p>
                      )}
                      {paid > 0 && (
                        <div className="mt-2 space-y-1 max-w-[200px]">
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
                  <div className="flex items-center gap-2">
                    <div className="text-right flex flex-col mr-2">
                      <span
                        className={`text-sm font-bold ${
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
                    {record.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-foreground"
                          onClick={() => handleOpenRepay(record)}
                          title={record.type === "borrowed" ? "Pay Back Amount" : "Collect Payment"}
                        >
                          <Coins className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600"
                          onClick={() => handleSettle(record._id)}
                          title="Instant full settlement"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => handleEdit(record)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <ConfirmDelete
                      onConfirm={() => handleDelete(record._id)}
                    />
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
          label="Total Borrowed"
          value={formatCurrency(summary.totalBorrowed)}
          icon={ArrowDownLeft}
          variant="danger"
          index="01"
        />
        <StatCard
          label="Total Lent"
          value={formatCurrency(summary.totalLent)}
          icon={ArrowUpRight}
          variant="success"
          index="02"
        />
        <StatCard
          label="Pending Payments"
          value={formatCurrency(summary.pendingPayments)}
          icon={Clock}
          variant="warning"
          index="03"
        />
        <StatCard
          label="Pending Collections"
          value={formatCurrency(summary.pendingCollections)}
          icon={Banknote}
          variant="default"
          index="04"
        />
      </div>

      {/* Tabs */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
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
