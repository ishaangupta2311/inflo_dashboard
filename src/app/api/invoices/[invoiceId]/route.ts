import { getInvoicePdf } from "@/lib/order-backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  let invoice: Awaited<ReturnType<typeof getInvoicePdf>>;

  try {
    invoice = await getInvoicePdf(invoiceId);
  } catch (error) {
    console.error("[api/invoices/:invoiceId] invoice data load failed:", error);
    return Response.json({ error: "Invoice data is temporarily unavailable." }, { status: 503 });
  }

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
