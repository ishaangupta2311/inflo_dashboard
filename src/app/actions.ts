"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  acceptQuote,
  createOrdersFromCart,
  createQuoteRequest,
  updateOrderLinksClient,
  updateOrderPrItemsClient,
  type CartLine,
  type ClientLinkEdit,
  type ClientPrEdit
} from "@/lib/order-backend";

export type CheckoutResult = { ok: true; count: number } | { ok: false; error: string };
export type SaveLinksResult = { ok: true } | { ok: false; error: string };

export async function checkoutAction(input: {
  lines: CartLine[];
  brief?: string;
}): Promise<CheckoutResult> {
  try {
    const orders = await createOrdersFromCart(input);
    revalidatePath("/orders");
    return { ok: true, count: orders.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Checkout failed." };
  }
}

export async function createQuoteRequestAction(formData: FormData) {
  const order = await createQuoteRequest({
    slug: String(formData.get("slug") || ""),
    targetUrl: String(formData.get("targetUrl") || ""),
    brief: String(formData.get("brief") || "")
  });

  revalidatePath("/orders");
  redirect(`/orders?created=${encodeURIComponent(order.id)}`);
}

export async function updateOrderLinksClientAction(input: {
  orderId: string;
  links: ClientLinkEdit[];
}): Promise<SaveLinksResult> {
  try {
    await updateOrderLinksClient(input);
    revalidatePath(`/orders/${input.orderId}`);
    revalidatePath("/orders");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't save changes." };
  }
}

export async function updateOrderPrItemsClientAction(input: {
  orderId: string;
  items: ClientPrEdit[];
}): Promise<SaveLinksResult> {
  try {
    await updateOrderPrItemsClient(input);
    revalidatePath(`/orders/${input.orderId}`);
    revalidatePath("/orders");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't save changes." };
  }
}

export async function acceptQuoteAction(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) {
    return;
  }

  await acceptQuote(orderId);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}
