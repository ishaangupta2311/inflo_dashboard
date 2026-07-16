import { auth } from "@clerk/nextjs/server";
import { quoteCart, type CartLine } from "@/lib/order-backend";

// Checkout preview only. The same code is resolved again when a PayPal order
// is created, so this response cannot be used to influence a charge.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { lines?: CartLine[]; discountCode?: string };
    const quote = await quoteCart(
      Array.isArray(body.lines) ? body.lines : [],
      String(body.discountCode || "")
    );
    if (!quote.discount) {
      return Response.json({ error: "Enter a discount code." }, { status: 400 });
    }

    return Response.json({
      originalAmount: quote.originalAmount,
      amount: quote.amount,
      discount: quote.discount
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not apply discount code.";
    return Response.json({ error: message }, { status: 400 });
  }
}
