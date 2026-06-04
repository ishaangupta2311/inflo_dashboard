import { createOrder, getDashboardData, parseCreateOrderInput } from "@/lib/order-backend";

export async function GET() {
  return Response.json(await getDashboardData());
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const order = await createOrder(parseCreateOrderInput(body));

    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to create order." },
      { status: 400 }
    );
  }
}
