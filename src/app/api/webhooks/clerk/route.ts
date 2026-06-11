import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Keeps the local `users` table in sync with Clerk. Verified via Svix signature
// (CLERK_WEBHOOK_SIGNING_SECRET). Configure the endpoint in the Clerk dashboard
// pointing at /api/webhooks/clerk, subscribed to user.* events.
export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } = evt.data;
      const email =
        email_addresses.find((address) => address.id === primary_email_address_id)?.email_address ??
        email_addresses[0]?.email_address ??
        null;

      const data = {
        email,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        imageUrl: image_url ?? null
      };

      await prisma.user.upsert({ where: { id }, create: { id, ...data }, update: data });
    }

    if (evt.type === "user.deleted") {
      const id = evt.data.id;
      if (id) {
        // Remove the user and everything they own so no rows are orphaned.
        // (If you'd rather retain orders as financial records, drop the order
        // deletes here and anonymize instead.)
        await prisma.$transaction([
          prisma.orderUpdate.deleteMany({ where: { order: { userId: id } } }),
          prisma.order.deleteMany({ where: { userId: id } }),
          prisma.user.deleteMany({ where: { id } })
        ]);
      }
    }
  } catch (err) {
    console.error(`Clerk webhook handler error (${evt.type}):`, err);
    // 5xx tells Svix to retry on its schedule.
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
