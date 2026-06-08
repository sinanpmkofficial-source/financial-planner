"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmActionProps {
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: "default" | "destructive" | "success";
  trigger: React.ReactElement;
}

export function ConfirmAction({
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  confirmVariant = "default",
  trigger,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAction = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(val) => !loading && setOpen(val)}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 cursor-pointer font-semibold",
              confirmVariant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              confirmVariant === "success" && "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
