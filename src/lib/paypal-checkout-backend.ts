import { prisma } from "@/lib/prisma";
import {
  createPaypalOrder,
  getPaypalOrder,
  type CaptureResult,
  type PaypalOrderDetails
} from "@/lib/paypal";
import {
  createOrdersFromCartForUser,
  quoteCart,
  type CartLine
} from "@/lib/order-backend";
import { capturedAmountMatches } from "@/lib/paypal-webhook-event";
import type { PayPalCheckout } from "@/generated/prisma/client";

const FINALIZABLE_STATES = ["pending", "approved", "failed"];

function cleanLines(lines: CartLine[]): CartLine[] {
  return lines
    .filter((line) => line && typeof line.id === "string")
    .map((line) => ({ id: line.id, quantity: Number(line.quantity) || 1 }));
}

function storedLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return cleanLines(value as CartLine[]);
}

export async function preparePaypalCheckout(input: {
  userId: string;
  userEmail?: string | null;
  lines: CartLine[];
  brief?: string;
  discountCode?: string;
}): Promise<{ paypalOrderId: string }> {
  const lines = cleanLines(input.lines);
  const quote = await quoteCart(lines, input.discountCode);
  const checkout = await prisma.payPalCheckout.create({
    data: {
      userId: input.userId,
      userEmail: input.userEmail,
      lines,
      brief: input.brief?.trim().slice(0, 4000) || null,
      expectedAmount: quote.amount,
      currency: "USD",
      discountCode: quote.discount?.code,
      discountPercentage: quote.discount?.percentage
    }
  });

  try {
    const order = await createPaypalOrder({
      amountValue: quote.amount.toFixed(2),
      currency: "USD",
      description: quote.description,
      customId: checkout.id
    });
    await prisma.payPalCheckout.update({
      where: { id: checkout.id },
      data: { paypalOrderId: order.id }
    });
    return { paypalOrderId: order.id };
  } catch (error) {
    await prisma.payPalCheckout
      .update({ where: { id: checkout.id }, data: { status: "failed" } })
      .catch(() => undefined);
    throw error;
  }
}

async function resolveCheckout(
  paypalOrderId: string,
  userId?: string
): Promise<{ checkout: PayPalCheckout; details?: PaypalOrderDetails }> {
  let checkout = await prisma.payPalCheckout.findUnique({ where: { paypalOrderId } });
  let details: PaypalOrderDetails | undefined;

  if (!checkout) {
    details = await getPaypalOrder(paypalOrderId);
    if (details.customId) {
      const recovered = await prisma.payPalCheckout.findUnique({ where: { id: details.customId } });
      if (recovered && (!recovered.paypalOrderId || recovered.paypalOrderId === paypalOrderId)) {
        checkout = await prisma.payPalCheckout.update({
          where: { id: recovered.id },
          data: { paypalOrderId }
        });
      }
    }
  }

  if (!checkout || (userId && checkout.userId !== userId)) {
    throw new Error("PayPal checkout was not found.");
  }
  return { checkout, details };
}

export async function ensurePaypalCheckoutOwner(
  paypalOrderId: string,
  userId: string
): Promise<void> {
  await resolveCheckout(paypalOrderId, userId);
}

export type FinalizeResult = { status: "paid" | "processing"; count: number };

export async function finalizePaypalCheckout(input: {
  paypalOrderId: string;
  userId?: string;
  capture: CaptureResult;
  paidAt?: Date;
  eventType?: string;
}): Promise<FinalizeResult> {
  const resolved = await resolveCheckout(input.paypalOrderId, input.userId);
  let { checkout } = resolved;
  let details = resolved.details;

  if (
    input.capture.status !== "COMPLETED" ||
    !input.capture.capturedValue ||
    !input.capture.currency
  ) {
    details ??= await getPaypalOrder(input.paypalOrderId);
  }
  const evidence = {
    status: input.capture.status === "COMPLETED" ? input.capture.status : details?.status,
    captureId: input.capture.captureId ?? details?.captureId,
    capturedValue: input.capture.capturedValue ?? details?.capturedValue,
    currency: input.capture.currency ?? details?.currency
  };

  if (evidence.status !== "COMPLETED") {
    throw new Error(`Payment was not completed (${evidence.status ?? "unknown"}).`);
  }
  if (
    !capturedAmountMatches(
      Number(checkout.expectedAmount),
      checkout.currency,
      evidence.capturedValue,
      evidence.currency
    )
  ) {
    console.error(
      `[paypal] amount mismatch on ${input.paypalOrderId}: captured ${evidence.capturedValue ?? "unknown"} ${evidence.currency ?? "unknown"}, expected ${checkout.expectedAmount.toFixed(2)} ${checkout.currency}`
    );
    throw new Error("Payment amount didn't match the saved checkout.");
  }

  if (checkout.status === "paid") {
    const count = await prisma.order.count({ where: { paymentRef: input.paypalOrderId } });
    return { status: "paid", count };
  }

  const claimed = await prisma.payPalCheckout.updateMany({
    where: { id: checkout.id, status: { in: FINALIZABLE_STATES } },
    data: {
      status: "processing",
      paypalOrderId: input.paypalOrderId,
      captureId: evidence.captureId,
      lastEventType: input.eventType
    }
  });
  if (claimed.count === 0) {
    checkout = await prisma.payPalCheckout.findUniqueOrThrow({ where: { id: checkout.id } });
    const count = await prisma.order.count({ where: { paymentRef: input.paypalOrderId } });
    if (checkout.status === "paid") return { status: "paid", count };
    if (checkout.status === "processing") return { status: "processing", count };
    throw new Error(`Checkout cannot be finalized from state ${checkout.status}.`);
  }

  const paidAt = input.paidAt ?? new Date();
  try {
    const orders = await createOrdersFromCartForUser(
      {
        lines: storedLines(checkout.lines),
        brief: checkout.brief ?? undefined,
        appliedDiscount:
          checkout.discountCode && checkout.discountPercentage
            ? { code: checkout.discountCode, percentage: checkout.discountPercentage }
            : undefined,
        payment: { ref: input.paypalOrderId, paidAt }
      },
      { userId: checkout.userId, email: checkout.userEmail }
    );
    await prisma.payPalCheckout.update({
      where: { id: checkout.id },
      data: {
        status: "paid",
        paidAt,
        captureId: evidence.captureId,
        lastEventType: input.eventType
      }
    });
    return { status: "paid", count: orders.length };
  } catch (error) {
    await prisma.payPalCheckout
      .updateMany({
        where: { id: checkout.id, status: "processing" },
        data: { status: "failed", lastEventType: input.eventType }
      })
      .catch(() => undefined);
    throw error;
  }
}

export async function recordPaypalCheckoutState(input: {
  status: "approved" | "denied" | "partially_refunded" | "refunded";
  eventType: string;
  paypalOrderId?: string;
  captureId?: string;
}): Promise<void> {
  const checkout = input.paypalOrderId
    ? await prisma.payPalCheckout.findUnique({ where: { paypalOrderId: input.paypalOrderId } })
    : input.captureId
      ? await prisma.payPalCheckout.findUnique({ where: { captureId: input.captureId } })
      : null;

  if (!checkout) return;
  if (input.status === "approved" && !["pending", "failed"].includes(checkout.status)) return;
  if (
    input.status === "denied" &&
    !["pending", "approved", "failed"].includes(checkout.status)
  ) {
    return;
  }

  await prisma.payPalCheckout.update({
    where: { id: checkout.id },
    data: { status: input.status, lastEventType: input.eventType }
  });
  if (
    (input.status === "refunded" || input.status === "partially_refunded") &&
    checkout.paypalOrderId
  ) {
    await prisma.order.updateMany({
      where: { paymentRef: checkout.paypalOrderId },
      data: { paymentStatus: input.status }
    });
  }
}
