"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createOrder, parseCreateOrderInput } from "@/lib/order-backend";

export async function createOrderAction(formData: FormData) {
  const order = await createOrder(parseCreateOrderInput(formData));

  revalidatePath("/orders");
  redirect(`/orders?created=${encodeURIComponent(order.id)}`);
}
