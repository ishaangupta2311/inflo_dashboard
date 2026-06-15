import { auth } from "@clerk/nextjs/server";
import { createPaypalOrder, isPaypalConfigured } from "@/lib/paypal";
import { priceCart, type CartLine } from "@/lib/order-backend";

// Step 1 of PayPal checkout: the browser SDK's createOrder callback hits this.
// We price the cart server-side (never trusting a client amount) and open a
// PayPal order for that total, returning its id for the SDK to approve.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!isPaypalConfigured()) {
    return Response.json({ error: "Payments are not configured." }, { status: 503 });
  }

  try {
    const body = (await req.json()) as { lines?: CartLine[] };
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const { amount, description } = priceCart(lines);

    const order = await createPaypalOrder({
      amountValue: amount.toFixed(2),
      currency: "USD",
      description,
      customId: userId
    });

    return Response.json({ id: order.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    console.error("[paypal] create-order:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
