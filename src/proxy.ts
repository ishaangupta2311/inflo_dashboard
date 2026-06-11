import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The webhook endpoint is unauthenticated (it verifies its own Svix signature).
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/webhooks(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

// Admin authorization is enforced in src/app/admin/layout.tsx (page gate) and
// requireAdmin() in the data layer — middleware can't read publicMetadata.

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
