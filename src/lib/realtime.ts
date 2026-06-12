const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Best-effort realtime ping: tells any open page for this order to re-fetch.
// The broadcast carries NO order data — clients re-load through the normal
// ownership-checked server path — so it's safe on a public channel even though
// the app authenticates with Clerk rather than Supabase Auth.
export async function notifyOrderChanged(orderId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return;
  }
  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        messages: [{ topic: `order-${orderId}`, event: "changed", payload: {}, private: false }]
      })
    });
  } catch {
    // Ignore — clients also refresh on focus and via a backstop poll.
  }
}
