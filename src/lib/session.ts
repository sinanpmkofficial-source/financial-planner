import { Types } from "mongoose";
import { auth } from "@/auth";

/**
 * Returns the authenticated user's id as an ObjectId, suitable for use in
 * Mongoose queries, `create` calls, and aggregation `$match` stages (which,
 * unlike find queries, do NOT auto-cast string ids).
 *
 * Throws if there is no active session — every data action must be scoped to
 * a user, so an unauthenticated call is a programming/authz error.
 */
export async function getCurrentUserId(): Promise<Types.ObjectId> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new Error("Unauthorized: no active session");
  }
  return new Types.ObjectId(id);
}
