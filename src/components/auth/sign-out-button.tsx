"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className
        )}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </form>
  );
}
