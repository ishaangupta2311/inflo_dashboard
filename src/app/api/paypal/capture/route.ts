import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { capturePaypalOrder, isPaypalConfigured } from "@/lib/paypal";
import { createOrdersFromCart, priceCart, type CartLine } from "@/lib/order-backend";

// Step 2 of PayPal checkout: the SDK's onApprove callback hits this with the
// approved PayPal order id. We capture the money, verify the captured amount
// still matches the server price of the submitted cart (guards against the cart
// being tampered between create-order and capture), then create the orders —
// stamped paid. Order creation is idempotent on the PayPal order id.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!isPaypalConfigured()) {
    return Response.json({ error: "Payments are not configured." }, { status: 503 });
  }

  try {
    const body = (await req.json()) as { paypalOrderId?: string; lines?: CartLine[]; brief?: string };
    const paypalOrderId = String(body.paypalOrderId || "").trim();
    if (!paypalOrderId) {
      return Response.json({ error: "Missing PayPal order id." }, { status: 400 });
    }
    const lines = Array.isArray(body.lines) ? body.lines : [];

    // Authoritative price for exactly the lines we're about to fulfil.
    const { amount } = priceCart(lines);

    const capture = await capturePaypalOrder(paypalOrderId);
    if (capture.status !== "COMPLETED") {
      return Response.json({ error: `Payment was not completed (${capture.status}).` }, { status: 402 });
    }

    // The captured amount must equal what these lines price to right now.
    if (capture.capturedValue && Number(capture.capturedValue) !== amount) {
      console.error(
        `[paypal] amount mismatch on ${paypalOrderId}: captured ${capture.capturedValue} vs priced ${amount}`
      );
      return Response.json(
        { error: "Payment amount didn't match your cart. Please contact support." },
        { status: 409 }
      );
    }

    const orders = await createOrdersFromCart({
      lines,
      brief: body.brief,
      payment: { ref: paypalOrderId, paidAt: new Date() }
    });

    revalidatePath("/orders");
    revalidatePath("/invoices");
    return Response.json({ ok: true, count: orders.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete payment.";
    console.error("[paypal] capture:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
