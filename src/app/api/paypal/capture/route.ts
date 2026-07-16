import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { capturePaypalOrder, isPaypalConfigured } from "@/lib/paypal";
import {
  ensurePaypalCheckoutOwner,
  finalizePaypalCheckout
} from "@/lib/paypal-checkout-backend";

// Step 2 of PayPal checkout: the SDK's onApprove callback hits this with the
// approved PayPal order id. The persisted checkout is the source of truth for
// ownership, cart contents, and price; the browser cannot replace those values.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!isPaypalConfigured()) {
    return Response.json({ error: "Payments are not configured." }, { status: 503 });
  }

  try {
    const body: unknown = await req.json();
    const paypalOrderId =
      body && typeof body === "object" && "paypalOrderId" in body
        ? String(body.paypalOrderId || "").trim()
        : "";
    if (!/^[A-Z0-9-]{6,64}$/i.test(paypalOrderId)) {
      return Response.json({ error: "Missing PayPal order id." }, { status: 400 });
    }
    await ensurePaypalCheckoutOwner(paypalOrderId, userId);
    const capture = await capturePaypalOrder(paypalOrderId);
    const result = await finalizePaypalCheckout({
      paypalOrderId,
      userId,
      capture,
      eventType: "browser.capture"
    });
    if (result.status === "processing") {
      return Response.json({ error: "Payment is still being recorded. Refresh your orders shortly." }, { status: 409 });
    }

    revalidatePath("/orders");
    revalidatePath("/invoices");
    revalidatePath("/admin/payments");
    return Response.json({ ok: true, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete payment.";
    console.error("[paypal] capture:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
