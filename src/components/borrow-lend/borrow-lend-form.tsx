"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  borrowLendSchema,
  type BorrowLendFormData,
} from "@/validations/borrow-lend";
import { createBorrowLend, updateBorrowLend } from "@/actions/borrow-lend";
import {
  getContacts,
  backfillContactsFromRecords,
  createContact,
} from "@/actions/contact";
import { toPaise, toRupees } from "@/lib/money";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactCombobox } from "@/components/contacts/contact-combobox";
import { MentionInput } from "@/components/contacts/mention-input";
import { Loader2 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
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
import type { BorrowLend, Contact } from "@/types";
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const isEditing = !!record;
  const { setDashboardDirty } = useUIStore();

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
          amount: toRupees(record.amount),
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
          createTransaction: true,
        },
  });

  useEffect(() => {
    if (open) {
      reset(
        record
          ? {
              personName: record.personName,
              amount: toRupees(record.amount),
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
              createTransaction: true,
            }
      );
    }
  }, [record, open, reset]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      let list = await getContacts();
      // First run: seed the suggestion list from existing borrow/lend history
      // so the feature is useful immediately rather than only going forward.
      if (list.length === 0) {
        const res = await backfillContactsFromRecords();
        if (res.success && res.added > 0) list = await getContacts();
      }
      if (!cancelled) setContacts(list);
    })().catch(() => setContacts([]));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleCreateContact = async (name: string): Promise<Contact | null> => {
    const res = await createContact({ name });
    if (res.success && res.contact) {
      const created = res.contact;
      setContacts((prev) =>
        prev.some((c) => c._id === created._id) ? prev : [...prev, created]
      );
      return created;
    }
    return null;
  };

  const type = watch("type");
  const personName = watch("personName");
  const notes = watch("notes");
  const dateValue = watch("date");
  const dueDateValue = watch("dueDate");
  const createTransaction = watch("createTransaction");

  const onSubmit = async (data: BorrowLendFormData) => {
    setLoading(true);
    try {
      const payload = { ...data, amount: toPaise(data.amount) };
      const result = isEditing
        ? await updateBorrowLend(record._id, payload)
        : await createBorrowLend(payload);

      if (result.success) {
        toast.success(isEditing ? "Record updated" : "Record added");
        setDashboardDirty(true);
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
            <ContactCombobox
              id="bl-person"
              placeholder="Who?"
              contacts={contacts}
              value={personName ?? ""}
              onChange={(v) =>
                setValue("personName", v, { shouldValidate: true })
              }
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
              value={type || ""}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="bl-date">Date</Label>
              <DatePicker
                date={dateValue ? new Date(dateValue) : new Date()}
                onSelect={(d) => {
                  if (d) {
                    setValue("date", format(d, "yyyy-MM-dd"), { shouldValidate: true });
                  }
                }}
              />
            </div>
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="bl-due">Due Date</Label>
              <DatePicker
                date={dueDateValue ? new Date(dueDateValue) : undefined}
                onSelect={(d) => {
                  setValue("dueDate", d ? format(d, "yyyy-MM-dd") : undefined, { shouldValidate: true });
                }}
                placeholder="Optional due date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bl-notes">Notes</Label>
            <MentionInput
              id="bl-notes"
              placeholder="Optional notes — type @ to tag a contact"
              contacts={contacts}
              value={notes ?? ""}
              onChange={(v) => setValue("notes", v, { shouldValidate: true })}
              onCreateContact={handleCreateContact}
            />
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2.5 py-1">
              <input
                type="checkbox"
                id="bl-create-tx"
                className="rounded border-border text-primary focus:ring-ring"
                checked={createTransaction ?? true}
                onChange={(e) =>
                  setValue("createTransaction", e.target.checked)
                }
              />
              <Label
                htmlFor="bl-create-tx"
                className="cursor-pointer text-xs font-medium text-muted-foreground select-none"
              >
                Record as {type === "borrowed" ? "Income" : "Expense"}{" "}
                transaction
              </Label>
            </div>
          )}

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
              ) : isEditing ? (
                "Update"
              ) : (
                "Add Record"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
