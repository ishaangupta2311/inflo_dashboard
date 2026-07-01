import { getOrder } from "@/lib/order-backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let order: Awaited<ReturnType<typeof getOrder>>;

  try {
    order = await getOrder(id);
  } catch (error) {
    console.error("[api/orders/:id] order data load failed:", error);
    return Response.json({ error: "Order data is temporarily unavailable." }, { status: 503 });
  }

  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  return Response.json({ order });
}
