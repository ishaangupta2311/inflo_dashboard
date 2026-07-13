import { auth, currentUser } from "@clerk/nextjs/server";
import { isPaypalConfigured } from "@/lib/paypal";
import { preparePaypalCheckout } from "@/lib/paypal-checkout-backend";
import type { CartLine } from "@/lib/order-backend";

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
    const body = (await req.json()) as { lines?: CartLine[]; brief?: string };
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
    const checkout = await preparePaypalCheckout({
      userId,
      userEmail,
      lines,
      brief: body.brief
    });

    return Response.json({ id: checkout.paypalOrderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    console.error("[paypal] create-order:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
