import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { parseStaffRole, type StaffRole } from "@/lib/roles";

// Role resolution prefers the session-token claim (no extra API call, if the
// instance is configured to surface public metadata) and falls back to reading
// publicMetadata directly via the Backend API. The fallback means roles work
// without any dashboard session-token customization.
//
// Memoized per request (React cache) so the many call sites in a single render —
// page-level redirect guards plus DashboardShell — share one currentUser()
// lookup instead of each hitting the Clerk Backend API.
export const getRole = cache(async (): Promise<StaffRole | null> => {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  const claimRole = parseStaffRole(sessionClaims?.metadata?.role);
  if (claimRole) {
    return claimRole;
  }

  const user = await currentUser();
  return parseStaffRole(user?.publicMetadata?.role);
});

/** Any staff member (admin, sub-admin, or employee) — the people who run the console. */
export async function isStaff(): Promise<boolean> {
  return (await getRole()) !== null;
}

/** Top-tier admin only. */
export async function isAdmin(): Promise<boolean> {
  return (await getRole()) === "admin";
}

/** Who can open the Team manager: admins (manage everyone) + sub-admins (manage employees). */
export async function canManageTeam(): Promise<boolean> {
  const role = await getRole();
  return role === "admin" || role === "sub-admin";
}

/** Throws unless the caller is staff. Returns their Clerk userId and role. */
export async function requireStaff(): Promise<{ userId: string; role: StaffRole }> {
  const { userId } = await auth();
  const role = await getRole();

  if (!userId || !role) {
    throw new Error("Staff access required.");
  }

  return { userId, role };
}

/** Throws unless the caller is a top-tier admin. Returns their Clerk userId. */
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated.");
  }
  if ((await getRole()) !== "admin") {
    throw new Error("Admin access required.");
  }

  return userId;
}
