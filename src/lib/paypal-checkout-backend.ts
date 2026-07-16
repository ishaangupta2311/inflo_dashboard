import { prisma } from "@/lib/prisma";
import {
  createPaypalOrder,
  getPaypalOrder,
  type CaptureResult,
  type PaypalOrderDetails
} from "@/lib/paypal";
import {
  createOrdersFromVerifiedCheckout,
  quoteCart,
  snapshotCart,
  type CartLine
} from "@/lib/order-backend";
import { parseCartLines, parseCartSnapshot, type CartSnapshotLine } from "@/lib/cart-checkout";
import { capturedAmountMatches, parsePaypalMoney } from "@/lib/paypal-webhook-event";
import type { PayPalCheckout } from "@/generated/prisma/client";

const FINALIZABLE_STATES = ["pending", "approved", "failed", "reconciliation_required"];
const REFUND_STATES = ["partially_refunded", "refunded"] as const;

function storedLines(value: unknown): CartLine[] {
  try {
    return parseCartLines(value);
  } catch {
    return [];
  }
}

function storedSnapshot(value: unknown): CartSnapshotLine[] {
  return parseCartSnapshot(value) ?? snapshotCart(storedLines(value));
}

export async function preparePaypalCheckout(input: {
  userId: string;
  userEmail?: string | null;
  lines: CartLine[];
  brief?: string;
  discountCode?: string;
}): Promise<{ paypalOrderId: string }> {
  const lines = parseCartLines(input.lines);
  const quote = await quoteCart(lines, input.discountCode, input.userId);
  const checkout = await prisma.payPalCheckout.create({
    data: {
      userId: input.userId,
      userEmail: input.userEmail,
      lines: quote.lines,
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

export type FinalizeResult = {
  status: "paid" | "processing" | "partially_refunded" | "refunded";
  count: number;
};

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
  const capturedAmount = parsePaypalMoney(evidence.capturedValue);
  if (capturedAmount === undefined) throw new Error("PayPal capture amount is invalid.");

  if (
    checkout.status === "paid" ||
    REFUND_STATES.includes(checkout.status as (typeof REFUND_STATES)[number])
  ) {
    const count = await prisma.order.count({ where: { paymentRef: input.paypalOrderId } });
    return { status: checkout.status as FinalizeResult["status"], count };
  }

  const paidAt = input.paidAt ?? new Date();
  const claimed = await prisma.payPalCheckout.updateMany({
    where: { id: checkout.id, status: { in: FINALIZABLE_STATES } },
    data: {
      status: "processing",
      paypalOrderId: input.paypalOrderId,
      captureId: evidence.captureId,
      capturedAmount,
      paidAt,
      lastEventType: input.eventType
    }
  });
  if (claimed.count === 0) {
    checkout = await prisma.payPalCheckout.findUniqueOrThrow({ where: { id: checkout.id } });
    const count = await prisma.order.count({ where: { paymentRef: input.paypalOrderId } });
    if (checkout.status === "paid") return { status: "paid", count };
    if (checkout.status === "processing") return { status: "processing", count };
    if (REFUND_STATES.includes(checkout.status as (typeof REFUND_STATES)[number])) {
      return { status: checkout.status as "partially_refunded" | "refunded", count };
    }
    throw new Error(`Checkout cannot be finalized from state ${checkout.status}.`);
  }

  try {
    const orders = await createOrdersFromVerifiedCheckout(
      {
        lines: storedSnapshot(checkout.lines),
        brief: checkout.brief ?? undefined,
        appliedDiscount:
          checkout.discountCode && checkout.discountPercentage
            ? { code: checkout.discountCode, percentage: checkout.discountPercentage }
            : undefined,
        chargeAmount: Number(checkout.expectedAmount),
        payment: { ref: input.paypalOrderId, paidAt }
      },
      { userId: checkout.userId, email: checkout.userEmail }
    );
    const finalized = await prisma.payPalCheckout.updateMany({
      where: { id: checkout.id, status: "processing" },
      data: {
        status: "paid",
        paidAt,
        captureId: evidence.captureId,
        lastEventType: input.eventType
      }
    });
    if (finalized.count === 1) return { status: "paid", count: orders.length };

    const latest = await prisma.payPalCheckout.findUniqueOrThrow({ where: { id: checkout.id } });
    if (REFUND_STATES.includes(latest.status as (typeof REFUND_STATES)[number])) {
      await prisma.order.updateMany({
        where: { paymentRef: input.paypalOrderId },
        data: { paymentStatus: latest.status }
      });
      return { status: latest.status as "partially_refunded" | "refunded", count: orders.length };
    }
    throw new Error(`Checkout cannot be finalized from state ${latest.status}.`);
  } catch (error) {
    await prisma.payPalCheckout
      .updateMany({
        where: { id: checkout.id, status: "processing" },
        data: { status: "reconciliation_required", lastEventType: input.eventType }
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
  capturedAmount?: number;
  refundedAmount?: number;
  currency?: string;
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

  if (REFUND_STATES.includes(input.status as (typeof REFUND_STATES)[number])) {
    if (
      input.refundedAmount === undefined ||
      input.capturedAmount === undefined ||
      !input.currency ||
      input.currency.toUpperCase() !== checkout.currency.toUpperCase() ||
      input.refundedAmount < 0 ||
      input.refundedAmount > input.capturedAmount
    ) {
      throw new Error("PayPal refund amount is invalid.");
    }
  }

  await prisma.payPalCheckout.update({
    where: { id: checkout.id },
    data: {
      status: input.status,
      lastEventType: input.eventType,
      ...(input.capturedAmount !== undefined ? { capturedAmount: input.capturedAmount } : {}),
      ...(input.refundedAmount !== undefined ? { refundedAmount: input.refundedAmount } : {}),
      ...(input.captureId ? { captureId: input.captureId } : {})
    }
  });
  const orderReference = input.paypalOrderId ?? checkout.paypalOrderId;
  if (REFUND_STATES.includes(input.status as (typeof REFUND_STATES)[number]) && orderReference) {
    await prisma.order.updateMany({
      where: { paymentRef: orderReference },
      data: { paymentStatus: input.status }
    });
  }
}
