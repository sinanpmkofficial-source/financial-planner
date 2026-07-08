/**
 * Optimistic-write helper for the online-first UI pattern used across the app.
 *
 * Flow: apply the change to local state/cache immediately so the UI feels
 * instant, then run the server action. If the server rejects (validation,
 * network, auth), roll back to exactly what was on screen before. The DB stays
 * the source of truth — callers should reconcile with a refetch inside
 * `onSuccess` so any server-computed fields (ids, progress, XP) self-heal.
 *
 * This deliberately does NOT provide offline queuing: a failed call rolls back
 * rather than being replayed later, so the user is never shown a save that
 * silently never reached the database.
 */
export type ActionResult = { success: boolean; error?: string };

export async function runOptimistic(opts: {
  /** Mutate local state + cache to the expected post-write result. */
  apply: () => void;
  /** Restore the pre-write state + cache. Called on any failure. */
  rollback: () => void;
  /** The server action performing the real write. */
  action: () => Promise<ActionResult>;
  /** Runs only after the server confirms success (e.g. refetch to reconcile). */
  onSuccess?: () => void;
  /** Runs after rollback with the failure message. */
  onError?: (message: string) => void;
}): Promise<ActionResult> {
  opts.apply();
  try {
    const result = await opts.action();
    if (!result.success) {
      opts.rollback();
      opts.onError?.(result.error ?? "Something went wrong");
      return result;
    }
    opts.onSuccess?.();
    return result;
  } catch (err) {
    opts.rollback();
    opts.onError?.(err instanceof Error ? err.message : "Something went wrong");
    return { success: false };
  }
}
