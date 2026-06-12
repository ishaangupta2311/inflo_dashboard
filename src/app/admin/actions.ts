"use server";

import { revalidatePath } from "next/cache";
import { addOrderUpdate, updateOrder, updateOrderLinksAdmin, type AdminLinkEdit } from "@/lib/order-backend";
import type { OrderStatus } from "@/lib/orders";

export type SaveLinksResult = { ok: true } | { ok: false; error: string };

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

export async function updateOrderAction(
  _prev: SaveLinksResult | null,
  formData: FormData
): Promise<SaveLinksResult> {
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) {
    return { ok: false, error: "Missing order." };
  }

  const statusRaw = String(formData.get("status") || "");
  const status = (STATUSES as string[]).includes(statusRaw) ? (statusRaw as OrderStatus) : undefined;
  const quoteStatusRaw = String(formData.get("quoteStatus") || "");

  try {
    await updateOrder(orderId, {
      status,
      progress: parseNumber(formData.get("progress")),
      amount: parseNumber(formData.get("amount")),
      quoteStatus: quoteStatusRaw || undefined,
      note: String(formData.get("note") || "")
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't save changes." };
  }

  revalidateOrder(orderId);
  return { ok: true };
}

export async function updateOrderLinksAdminAction(input: {
  orderId: string;
  links: AdminLinkEdit[];
}): Promise<SaveLinksResult> {
  try {
    await updateOrderLinksAdmin(input);
    revalidateOrder(input.orderId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't save changes." };
  }
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
