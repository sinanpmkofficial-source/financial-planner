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
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface ConfirmDeleteProps {
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  trigger?: React.ReactElement;
}

export function ConfirmDelete({
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  trigger,
}: ConfirmDeleteProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(val) => !loading && setOpen(val)}>
      <AlertDialogTrigger
        render={
          trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer" />
          )
        }
      >
        {!trigger && <Trash2 className="w-4 h-4" />}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center cursor-pointer font-semibold"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
