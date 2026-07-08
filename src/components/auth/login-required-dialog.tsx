import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Full-screen blocking overlay shown when an unauthenticated visitor lands on a
 * protected route. It covers the page content and forces a sign-in before
 * anything can be viewed.
 */
export function LoginRequiredDialog() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <h2
          id="login-required-title"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          Login to view
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You need to be signed in to access this page.
        </p>
        <Link href="/sign-in" className={buttonVariants({ className: "mt-5 w-full" })}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
