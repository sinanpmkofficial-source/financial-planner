"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const clearUserCaches = useUIStore((s) => s.clearUserCaches);

  // Clear the persisted per-user caches on the client before the server action
  // signs out and redirects, so a shared browser doesn't leak the previous
  // user's data to the next sign-in.
  const handleSignOut = async () => {
    clearUserCaches();
    await signOutAction();
  };

  return (
    <form action={handleSignOut}>
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
