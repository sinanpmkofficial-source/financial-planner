"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  borrowLendSchema,
  type BorrowLendFormData,
} from "@/validations/borrow-lend";
import { createBorrowLend, updateBorrowLend } from "@/actions/borrow-lend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { BorrowLend } from "@/types";
import { format } from "date-fns";

interface BorrowLendFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: BorrowLend;
  onSuccess?: () => void;
}

export function BorrowLendForm({
  open,
  onOpenChange,
  record,
  onSuccess,
}: BorrowLendFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BorrowLendFormData>({
    resolver: zodResolver(borrowLendSchema),
    defaultValues: record
      ? {
          personName: record.personName,
          amount: record.amount,
          type: record.type,
          date: format(new Date(record.date), "yyyy-MM-dd"),
          dueDate: record.dueDate
            ? format(new Date(record.dueDate), "yyyy-MM-dd")
            : undefined,
          notes: record.notes ?? "",
        }
      : {
          personName: "",
          amount: undefined,
          type: undefined,
          date: format(new Date(), "yyyy-MM-dd"),
          dueDate: undefined,
          notes: "",
        },
  });

  const type = watch("type");

  const onSubmit = async (data: BorrowLendFormData) => {
    setLoading(true);
    try {
      const result = isEditing
        ? await updateBorrowLend(record._id, data)
        : await createBorrowLend(data);

      if (result.success) {
        toast.success(isEditing ? "Record updated" : "Record added");
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Record" : "Add Borrow / Lend"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bl-person">Person Name</Label>
            <Input
              id="bl-person"
              placeholder="Who?"
              {...register("personName")}
            />
            {errors.personName && (
              <p className="text-xs text-destructive">
                {errors.personName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bl-amount">Amount (₹)</Label>
            <Input
              id="bl-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                v && setValue("type", v as "borrowed" | "lent", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="borrowed">Borrowed (I owe)</SelectItem>
                <SelectItem value="lent">Lent (They owe me)</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bl-date">Date</Label>
              <Input id="bl-date" type="date" {...register("date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bl-due">Due Date</Label>
              <Input id="bl-due" type="date" {...register("dueDate")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bl-notes">Notes</Label>
            <Input
              id="bl-notes"
              placeholder="Optional notes"
              {...register("notes")}
            />
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
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Add Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
