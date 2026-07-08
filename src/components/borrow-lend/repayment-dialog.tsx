"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { BorrowLend } from "@/types";
import { format } from "date-fns";
import { recordRepayment } from "@/actions/borrow-lend";
import { toPaise, toRupees } from "@/lib/money";
import { formatCurrency } from "@/lib/format";

interface RepaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: BorrowLend | null;
  onSuccess?: () => void;
}

export function RepaymentDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: RepaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [createTransaction, setCreateTransaction] = useState(true);
  const [loading, setLoading] = useState(false);

  const remaining = record ? record.amount - (record.paidAmount ?? 0) : 0;

  useEffect(() => {
    if (open && record) {
      setAmount(String(toRupees(remaining)));
      setDate(format(new Date(), "yyyy-MM-dd"));
      setCreateTransaction(true);
    }
  }, [open, record, remaining]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const repaymentAmount = parseFloat(amount);

    if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    const repaymentPaise = toPaise(repaymentAmount);
    if (repaymentPaise > remaining) {
      toast.error(`Amount exceeds the remaining balance of ${formatCurrency(remaining)}`);
      return;
    }

    setLoading(true);
    try {
      const result = await recordRepayment(
        record._id,
        repaymentPaise,
        date,
        createTransaction
      );

      if (result.success) {
        toast.success("Repayment recorded successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to record repayment");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isLent = record.type === "lent";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isLent ? "Record Collection" : "Record Repayment"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="text-sm text-muted-foreground bg-muted/40 p-3.5 rounded-xl border border-foreground/5 space-y-1">
            <p className="flex justify-between">
              <span>Original Amount:</span>
              <span className="font-semibold text-foreground">{formatCurrency(record.amount)}</span>
            </p>
            <p className="flex justify-between">
              <span>Already Repaid:</span>
              <span className="font-semibold text-foreground">{formatCurrency(record.paidAmount ?? 0)}</span>
            </p>
            <p className="flex justify-between border-t border-border/60 pt-1.5 mt-1.5 font-medium text-foreground">
              <span>Remaining Balance:</span>
              <span className="font-bold">{formatCurrency(remaining)}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repay-amount">
              {isLent ? "Collected Amount" : "Repaid Amount"} (₹)
            </Label>
            <Input
              id="repay-amount"
              type="number"
              step="0.01"
              max={toRupees(remaining)}
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2 flex flex-col">
            <Label htmlFor="repay-date">Payment Date</Label>
            <DatePicker
              date={date ? new Date(date) : new Date()}
              onSelect={(d) => {
                if (d) {
                  setDate(format(d, "yyyy-MM-dd"));
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2.5 py-1">
            <input
              type="checkbox"
              id="create-tx"
              className="rounded border-border text-primary focus:ring-ring"
              checked={createTransaction}
              onChange={(e) => setCreateTransaction(e.target.checked)}
            />
            <Label htmlFor="create-tx" className="cursor-pointer text-xs font-medium text-muted-foreground select-none">
              Record as {isLent ? "Income" : "Expense"} transaction
            </Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 flex items-center justify-center" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
