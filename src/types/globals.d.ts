export {};

// Types the staff role on both Clerk surfaces we read it from:
//  - session-token claim (fast path; requires the dashboard claim
//    { "metadata": "{{user.public_metadata}}" } to be present)
//  - publicMetadata read directly via currentUser() (always works)
// `null` is permitted on publicMetadata so we can clear the key (Clerk removes a
// metadata field when it's set to null) to revoke a member's staff access.
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "admin" | "sub-admin" | "employee" | null;
    };
  }
  interface UserPublicMetadata {
    role?: "admin" | "sub-admin" | "employee" | null;
  }
}
