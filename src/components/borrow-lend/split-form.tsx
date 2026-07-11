"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { splitSchema, type SplitFormData } from "@/validations/split";
import { createSplit } from "@/actions/split";
import { getContacts, createContact } from "@/actions/contact";
import { toPaise } from "@/lib/money";
import { formatCurrency } from "@/lib/format";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MentionInput } from "@/components/contacts/mention-input";
import type { Contact } from "@/types";
import { Loader2, Plus, X } from "lucide-react";
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
import { EXPENSE_CATEGORIES } from "@/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface SplitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const emptyDefaults: SplitFormData = {
  description: "",
  payer: "me",
  myShare: undefined as unknown as number,
  category: "Other",
  date: format(new Date(), "yyyy-MM-dd"),
  dueDate: undefined,
  splitMode: "itemized",
  participants: [{ personName: "", amount: undefined as unknown as number }],
  othersOwe: undefined,
  groupLabel: "",
  paidBy: "",
};

export function SplitForm({ open, onOpenChange, onSuccess }: SplitFormProps) {
  const { setDashboardDirty } = useUIStore();
  const [contacts, setContacts] = useState<Contact[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SplitFormData>({
    resolver: zodResolver(splitSchema),
    defaultValues: emptyDefaults,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "participants",
  });

  useEffect(() => {
    if (open) {
      reset(emptyDefaults);
      getContacts()
        .then(setContacts)
        .catch(() => setContacts([]));
    }
  }, [open, reset]);

  const payer = watch("payer");
  const dateValue = watch("date");
  const dueDateValue = watch("dueDate");
  const category = watch("category");
  const myShare = watch("myShare");
  const participants = watch("participants");
  const splitMode = watch("splitMode");
  const othersOwe = watch("othersOwe");
  const description = watch("description");

  const iPaid = payer === "me";
  const groupMode = iPaid && splitMode === "group";

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

  // Live total so the user can sanity-check against the actual bill.
  const totalRupees = iPaid
    ? groupMode
      ? (Number(myShare) || 0) + (Number(othersOwe) || 0)
      : (Number(myShare) || 0) +
        (participants ?? []).reduce(
          (sum, p) => sum + (Number(p?.amount) || 0),
          0
        )
    : Number(myShare) || 0;

  const onSubmit = async (data: SplitFormData) => {
    const isGroup = data.payer === "me" && data.splitMode === "group";
    const payload: SplitFormData = {
      ...data,
      myShare: toPaise(Number(data.myShare) || 0),
      othersOwe: isGroup ? toPaise(Number(data.othersOwe) || 0) : undefined,
      participants:
        data.payer === "me" && !isGroup
          ? (data.participants ?? []).map((p) => ({
              personName: p.personName,
              amount: toPaise(Number(p.amount) || 0),
            }))
          : undefined,
    };

    const result = await createSplit(payload);
    if (result.success) {
      toast.success("Split recorded");
      setDashboardDirty(true);
      reset(emptyDefaults);
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a Split</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Who paid toggle */}
          <div className="space-y-2">
            <Label>Who paid the bill?</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["me", "other"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("payer", value, { shouldValidate: true })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    payer === value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-border/80"
                  )}
                >
                  {value === "me" ? "I paid" : "Someone else paid"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {iPaid
                ? "Your share is logged as an expense; everyone else's share becomes money lent to you."
                : "Only your share is recorded as borrowed — you owe it to whoever paid."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="split-desc">Description</Label>
            <MentionInput
              id="split-desc"
              placeholder="e.g. Dinner — type @ to tag a contact"
              contacts={contacts}
              value={description ?? ""}
              onChange={(v) =>
                setValue("description", v, { shouldValidate: true })
              }
              onCreateContact={handleCreateContact}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="split-myshare">My share (₹)</Label>
              <Input
                id="split-myshare"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("myShare", {
                  setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)),
                })}
              />
              {errors.myShare && (
                <p className="text-xs text-destructive">
                  {errors.myShare.message}
                </p>
              )}
            </div>
            {iPaid && (
              <div className="space-y-2">
                <Label>My share category</Label>
                <Select
                  value={category || "Other"}
                  onValueChange={(v) =>
                    v && setValue("category", v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {iPaid ? (
            <div className="space-y-3">
              {/* How to record who owes you */}
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["itemized", "Split by person"],
                    ["group", "Just track total"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setValue("splitMode", value, { shouldValidate: true })
                    }
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                      (splitMode ?? "itemized") === value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-border/80"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {groupMode ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="split-others">Others owe me (₹)</Label>
                      <Input
                        id="split-others"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register("othersOwe", {
                          setValueAs: (v) =>
                            v === "" || v == null ? undefined : Number(v),
                        })}
                      />
                      {errors.othersOwe && (
                        <p className="text-xs text-destructive">
                          {errors.othersOwe.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="split-grouplabel">Label (optional)</Label>
                      <Input
                        id="split-grouplabel"
                        placeholder="Others"
                        {...register("groupLabel")}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tracked as one record you can mark settled once everyone has
                    paid you back — no need to name each person.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>People who owe you</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    append({
                      personName: "",
                      amount: undefined as unknown as number,
                    })
                  }
                >
                  <Plus className="w-3 h-3" />
                  Add person
                </Button>
              </div>
              {typeof errors.participants?.message === "string" && (
                <p className="text-xs text-destructive">
                  {errors.participants.message}
                </p>
              )}
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Name"
                        {...register(`participants.${index}.personName`)}
                      />
                      {errors.participants?.[index]?.personName && (
                        <p className="text-[11px] text-destructive">
                          {errors.participants[index]?.personName?.message}
                        </p>
                      )}
                    </div>
                    <div className="w-28 space-y-1">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="₹"
                        {...register(`participants.${index}.amount`, {
                          valueAsNumber: true,
                        })}
                      />
                      {errors.participants?.[index]?.amount && (
                        <p className="text-[11px] text-destructive">
                          {errors.participants[index]?.amount?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="split-paidby">Paid by</Label>
              <Input
                id="split-paidby"
                placeholder="Who paid the bill?"
                {...register("paidBy")}
              />
              {errors.paidBy && (
                <p className="text-xs text-destructive">
                  {errors.paidBy.message}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="split-date">Date</Label>
              <DatePicker
                date={dateValue ? new Date(dateValue) : new Date()}
                onSelect={(d) => {
                  if (d)
                    setValue("date", format(d, "yyyy-MM-dd"), {
                      shouldValidate: true,
                    });
                }}
              />
            </div>
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="split-due">Due Date</Label>
              <DatePicker
                date={dueDateValue ? new Date(dueDateValue) : undefined}
                onSelect={(d) =>
                  setValue("dueDate", d ? format(d, "yyyy-MM-dd") : undefined, {
                    shouldValidate: true,
                  })
                }
                placeholder="Optional due date"
              />
            </div>
          </div>

          <div className="flex justify-between items-center rounded-xl bg-muted/40 border border-foreground/5 px-3.5 py-2.5 text-sm">
            <span className="text-muted-foreground">Total bill</span>
            <span className="font-bold text-foreground">
              {formatCurrency(toPaise(totalRupees))}
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Record Split"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
