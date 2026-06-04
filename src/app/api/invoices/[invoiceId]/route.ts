import { getInvoice } from "@/lib/order-backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const invoice = await getInvoice(invoiceId);

  if (!invoice) {
    return Response.json({ error: "Invoice not found." }, { status: 404 });
  }

  return new Response(invoice, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${invoiceId}.txt"`
    }
  });
}
