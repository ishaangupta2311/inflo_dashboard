// PayPal Online Checkout (Orders v2 API) — server-side client.
//
// The whole integration is gated behind the two credential env vars: until
// NEXT_PUBLIC_PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET are set, isPaypalConfigured()
// is false and checkout falls back to the free "place order, pay later" flow.
// Paste the client id + secret (and, for production, PAYPAL_ENV=live) and the
// "Pay with PayPal" flow starts working with no code changes.
//
//   PAYPAL_ENV                  "sandbox" (default) | "live"
//   NEXT_PUBLIC_PAYPAL_CLIENT_ID   the public client id (loaded by the browser SDK)
//   PAYPAL_CLIENT_SECRET           the secret (server only — never exposed)

// The server needs the client id too (for the OAuth Basic credential). Accept it
// from a server-only var if set, otherwise reuse the public one — they're the
// same value, so a single NEXT_PUBLIC_PAYPAL_CLIENT_ID is enough.
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";

export function paypalEnv(): "live" | "sandbox" {
  return (process.env.PAYPAL_ENV ?? "sandbox").trim().toLowerCase() === "live" ? "live" : "sandbox";
}

const API_BASE =
  paypalEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

/** True once both credentials are present — gates the entire PayPal flow. */
export function isPaypalConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

// Cache the OAuth token in module memory until shortly before it expires so we
// don't mint a new one on every checkout request.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

/**
 * Create a PayPal order for a single, server-priced amount. Returns the PayPal
 * order id the browser SDK approves. `amountValue` must be a 2-decimal string
 * (e.g. "120.00"); the amount is set server-side and never trusted from the client.
 */
export async function createPaypalOrder(input: {
  amountValue: string;
  currency?: string;
  description?: string;
  customId?: string;
}): Promise<{ id: string }> {
  const token = await accessToken();
  const res = await fetch(`${API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: input.currency ?? "USD", value: input.amountValue },
          description: input.description?.slice(0, 127),
          custom_id: input.customId?.slice(0, 127)
        }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal create-order failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return { id: data.id as string };
}

export type CaptureResult = {
  status: string; // PayPal order status, "COMPLETED" on success
  captureId?: string; // capture transaction id
  capturedValue?: string; // e.g. "120.00"
  currency?: string;
  payerEmail?: string;
  alreadyCaptured?: boolean; // a duplicate onApprove for an already-captured order
};

/** Capture (collect) the money for a previously-approved PayPal order. */
export async function capturePaypalOrder(paypalOrderId: string): Promise<CaptureResult> {
  const token = await accessToken();
  const res = await fetch(`${API_BASE}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store"
  });

  const data = await res.json();
  if (!res.ok) {
    // A duplicated approval (double-click / retry) surfaces as already-captured.
    // Treat it as a completed payment — the order-creation step is idempotent.
    const issue = data?.details?.[0]?.issue;
    if (issue === "ORDER_ALREADY_CAPTURED") {
      return { status: "COMPLETED", alreadyCaptured: true };
    }
    throw new Error(`PayPal capture failed (${res.status}): ${JSON.stringify(data)}`);
  }

  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    captureId: capture?.id,
    capturedValue: capture?.amount?.value,
    currency: capture?.amount?.currency_code,
    payerEmail: data?.payer?.email_address
  };
}
