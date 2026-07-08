import { auth } from "@clerk/nextjs/server";

/**
 * Data Access Layer helper. Returns the authenticated Clerk user id, or throws.
 * Every server action calls this and scopes its queries by the returned id so
 * users can only ever read/write their own data.
 */
export async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized: no signed-in user");
  }
  return userId;
}
