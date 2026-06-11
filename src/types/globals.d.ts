export {};

// Types the admin role on both Clerk surfaces we read it from:
//  - session-token claim (fast path; requires the dashboard claim
//    { "metadata": "{{user.public_metadata}}" } to be present)
//  - publicMetadata read directly via currentUser() (always works)
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "admin";
    };
  }
  interface UserPublicMetadata {
    role?: "admin";
  }
}
