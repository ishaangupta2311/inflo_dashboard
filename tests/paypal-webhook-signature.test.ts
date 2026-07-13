import test from "node:test";
import assert from "node:assert/strict";

test("posts PayPal transmission data for signature verification", async () => {
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID = "sandbox-client";
  process.env.PAYPAL_CLIENT_SECRET = "sandbox-secret";
  process.env.PAYPAL_WEBHOOK_ID = "sandbox-webhook";
  process.env.PAYPAL_ENV = "sandbox";

  const calls: { url: string; body?: string }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: typeof init?.body === "string" ? init.body : undefined });
    if (url.endsWith("/v1/oauth2/token")) {
      return Response.json({ access_token: "token", expires_in: 3600 });
    }
    return Response.json({ verification_status: "SUCCESS" });
  };

  try {
    const { verifyPaypalWebhookSignature } = await import("../src/lib/paypal.ts");
    const verified = await verifyPaypalWebhookSignature(
      {
        transmissionId: "transmission-1",
        transmissionTime: "2026-07-13T12:00:00Z",
        certUrl: "https://api-m.sandbox.paypal.com/cert",
        authAlgo: "SHA256withRSA",
        transmissionSig: "signature"
      },
      { id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" }
    );

    assert.equal(verified, true);
    assert.equal(calls.length, 2);
    assert.match(calls[1].url, /api-m\.sandbox\.paypal\.com/);
    assert.deepEqual(JSON.parse(calls[1].body ?? "{}"), {
      transmission_id: "transmission-1",
      transmission_time: "2026-07-13T12:00:00Z",
      cert_url: "https://api-m.sandbox.paypal.com/cert",
      auth_algo: "SHA256withRSA",
      transmission_sig: "signature",
      webhook_id: "sandbox-webhook",
      webhook_event: { id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
