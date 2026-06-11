import { getInvoicePdf } from "@/lib/order-backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const invoice = await getInvoicePdf(invoiceId);

  if (!invoice) {
    return Response.json({ error: "Invoice not found." }, { status: 404 });
  }

  // Copy into a fresh ArrayBuffer-backed array so the body type matches BodyInit
  // (pdf-lib returns Uint8Array<ArrayBufferLike>).
  return new Response(new Uint8Array(invoice.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
