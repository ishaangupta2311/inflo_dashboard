import { revalidatePath } from "next/cache";
import {
  capturePaypalOrder,
  getPaypalCaptureDetails,
  getPaypalOrder,
  isPaypalWebhookConfigured,
  verifyPaypalWebhookSignature,
  type CaptureResult,
  type PaypalTransmissionHeaders
} from "@/lib/paypal";
import {
  finalizePaypalCheckout,
  recordPaypalCheckoutState
} from "@/lib/paypal-checkout-backend";
import {
  captureAmountForEvent,
  captureIdForEvent,
  parsePaypalMoney,
  paypalOrderIdForEvent,
  type PaypalWebhookEvent
} from "@/lib/paypal-webhook-event";

export const runtime = "nodejs";

function transmissionHeaders(req: Request): PaypalTransmissionHeaders | null {
  const values = {
    transmissionId: req.headers.get("paypal-transmission-id"),
    transmissionTime: req.headers.get("paypal-transmission-time"),
    certUrl: req.headers.get("paypal-cert-url"),
    authAlgo: req.headers.get("paypal-auth-algo"),
    transmissionSig: req.headers.get("paypal-transmission-sig")
  };
  return Object.values(values).every(Boolean) ? (values as PaypalTransmissionHeaders) : null;
}

export async function POST(req: Request) {
  if (!isPaypalWebhookConfigured()) {
    return Response.json({ error: "PayPal webhook is not configured." }, { status: 503 });
  }

  const headers = transmissionHeaders(req);
  if (!headers) {
    return Response.json({ error: "Missing PayPal transmission headers." }, { status: 401 });
  }

  let event: PaypalWebhookEvent;
  try {
    event = JSON.parse(await req.text()) as PaypalWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (!event?.id || !event.event_type || !event.resource) {
    return Response.json({ error: "Invalid webhook event." }, { status: 400 });
  }

  try {
    const verified = await verifyPaypalWebhookSignature(
      headers,
      event as unknown as Record<string, unknown>
    );
    if (!verified) {
      return Response.json({ error: "Invalid PayPal signature." }, { status: 401 });
    }

    const paypalOrderId = paypalOrderIdForEvent(event);
    const captureId = captureIdForEvent(event);

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      if (!paypalOrderId) throw new Error("Completed capture did not include a PayPal order id.");
      const amount = captureAmountForEvent(event);
      const capture: CaptureResult = {
        status: "COMPLETED",
        captureId,
        capturedValue: amount.value,
        currency: amount.currency
      };
      const eventTime = event.create_time ? new Date(event.create_time) : new Date();
      await finalizePaypalCheckout({
        paypalOrderId,
        capture,
        paidAt: Number.isNaN(eventTime.getTime()) ? new Date() : eventTime,
        eventType: event.event_type
      });
      revalidatePath("/orders");
      revalidatePath("/invoices");
      revalidatePath("/admin/payments");
    } else if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      if (!paypalOrderId) throw new Error("Approved checkout did not include a PayPal order id.");
      await recordPaypalCheckoutState({
        status: "approved",
        eventType: event.event_type,
        paypalOrderId
      });
      const capture = await capturePaypalOrder(paypalOrderId);
      await finalizePaypalCheckout({
        paypalOrderId,
        capture,
        eventType: event.event_type
      });
      revalidatePath("/orders");
      revalidatePath("/invoices");
      revalidatePath("/admin/payments");
    } else if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
      await recordPaypalCheckoutState({
        status: "denied",
        eventType: event.event_type,
        paypalOrderId,
        captureId
      });
    } else if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      if (!captureId) throw new Error("Refund event did not include a capture id.");
      const captureDetails = await getPaypalCaptureDetails(captureId);
      if (captureDetails.status !== "REFUNDED" && captureDetails.status !== "PARTIALLY_REFUNDED") {
        throw new Error(
          `Capture refund state is not available yet (${captureDetails.status || "unknown"}).`
        );
      }
      const resolvedPaypalOrderId = paypalOrderId ?? captureDetails.paypalOrderId;
      if (!resolvedPaypalOrderId) throw new Error("Refund did not include a PayPal order id.");
      const orderDetails = await getPaypalOrder(resolvedPaypalOrderId);
      const capturedAmount = parsePaypalMoney(captureDetails.capturedValue);
      const refundedAmount = parsePaypalMoney(orderDetails.refundedValue);
      if (capturedAmount === undefined || refundedAmount === undefined) {
        throw new Error("Capture refund totals are unavailable.");
      }
      await recordPaypalCheckoutState({
        status: captureDetails.status === "REFUNDED" ? "refunded" : "partially_refunded",
        eventType: event.event_type,
        paypalOrderId: resolvedPaypalOrderId,
        captureId,
        capturedAmount,
        refundedAmount,
        currency: captureDetails.currency
      });
      revalidatePath("/orders");
      revalidatePath("/invoices");
      revalidatePath("/admin/payments");
    }

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process PayPal webhook.";
    console.error(`[paypal] webhook ${event.id} (${event.event_type}):`, message);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
