"use server";

import { revalidatePath } from "next/cache";
import { addOrderUpdate, updateOrder } from "@/lib/order-backend";
import type { OrderStatus } from "@/lib/orders";

const STATUSES: OrderStatus[] = [
  "Brief received",
  "In outreach",
  "Content review",
  "Publishing",
  "Completed"
];

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function updateOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) {
    return;
  }

  const statusRaw = String(formData.get("status") || "");
  const status = (STATUSES as string[]).includes(statusRaw) ? (statusRaw as OrderStatus) : undefined;
  const quoteStatusRaw = String(formData.get("quoteStatus") || "");

  await updateOrder(orderId, {
    status,
    progress: parseNumber(formData.get("progress")),
    amount: parseNumber(formData.get("amount")),
    quoteStatus: quoteStatusRaw || undefined,
    note: String(formData.get("note") || "")
  });

  revalidateOrder(orderId);
}

export async function postUpdateAction(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!orderId || !body) {
    return;
  }

  await addOrderUpdate(orderId, body);
  revalidateOrder(orderId);
}
