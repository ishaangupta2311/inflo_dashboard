// Pure, client-safe role definitions and hierarchy rules. No server imports here
// so this can be pulled into client components (e.g. the add-member form) without
// dragging the Clerk backend into the browser bundle.

export type StaffRole = "admin" | "sub-admin" | "employee";

export const STAFF_ROLES: StaffRole[] = ["admin", "sub-admin", "employee"];

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  "sub-admin": "Sub-admin",
  employee: "Team member"
};

const ROLE_RANK: Record<StaffRole, number> = { admin: 3, "sub-admin": 2, employee: 1 };

export function parseStaffRole(value: unknown): StaffRole | null {
  return typeof value === "string" && (STAFF_ROLES as string[]).includes(value)
    ? (value as StaffRole)
    : null;
}

/** Sort: highest rank first, then alphabetically by email. */
export function compareMembers(
  a: { role: StaffRole; email: string },
  b: { role: StaffRole; email: string }
): number {
  return ROLE_RANK[b.role] - ROLE_RANK[a.role] || a.email.localeCompare(b.email);
}

/**
 * Roles an actor is allowed to grant.
 *  - admin     → can grant any role (full team control)
 *  - sub-admin → can only grant employee
 *  - employee  → cannot grant anything
 */
export function assignableRoles(actor: StaffRole): StaffRole[] {
  if (actor === "admin") return ["admin", "sub-admin", "employee"];
  if (actor === "sub-admin") return ["employee"];
  return [];
}

/** Whether `actor` may modify/remove a member who currently holds `targetRole`. */
export function canManage(actor: StaffRole, targetRole: StaffRole): boolean {
  if (actor === "admin") return true;
  if (actor === "sub-admin") return targetRole === "employee";
  return false;
}
