import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Memoized browser Supabase client used only for Realtime subscriptions.
// Returns null when the public env vars aren't configured, so callers can fall
// back to polling. No database access happens through this client — data is
// always fetched through the normal server path (Prisma + Clerk ownership check).
let cached: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) {
    return cached;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
  return cached;
}
