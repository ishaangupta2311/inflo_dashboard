import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";

// Role resolution prefers the session-token claim (no extra API call, if the
// instance is configured to surface public metadata) and falls back to reading
// publicMetadata directly via the Backend API. The fallback means admin works
// without any dashboard session-token customization.

// Memoized per request (React cache) so the multiple call sites in a single
// render — the page-level redirect guard plus DashboardShell — share one
// currentUser() lookup instead of each hitting the Clerk Backend API.
export const isAdmin = cache(async (): Promise<boolean> => {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return false;
  }
  if (sessionClaims?.metadata?.role === "admin") {
    return true;
  }

  const user = await currentUser();
  return user?.publicMetadata?.role === "admin";
});

/** Throws unless the caller is signed in AND an admin. Returns the Clerk userId. */
export async function requireAdmin(): Promise<string> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    throw new Error("Not authenticated.");
  }
  if (sessionClaims?.metadata?.role === "admin") {
    return userId;
  }

  const user = await currentUser();
  if (user?.publicMetadata?.role === "admin") {
    return userId;
  }

  throw new Error("Admin access required.");
}
