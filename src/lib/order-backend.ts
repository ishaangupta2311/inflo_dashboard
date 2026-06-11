import { unstable_noStore as noStore } from "next/cache";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { catalogBySlug, findBuyable } from "@/lib/catalog";
import { serviceOptions, type Order, type OrderStatus } from "@/lib/orders";
import type { Order as OrderRow, OrderUpdate as OrderUpdateRow } from "@/generated/prisma/client";

export type CreateOrderInput = {
  category: Order["category"];
  service: string;
  targetUrl: string;
  deliveryWindow: "standard" | "priority" | "managed";
  budgetRange: string;
  brief: string;
};

type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  tone: "violet" | "ink" | "coral";
};

async function requireUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated.");
  }

  return userId;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    service: row.service,
    category: row.category as Order["category"],
    status: row.status as OrderStatus,
    orderedAt: formatDate(row.orderedAt),
    dueAt: formatDate(row.dueAt),
    amount: row.amount,
    progress: row.progress,
    targetUrl: row.targetUrl,
    deliverables: row.deliverables,
    owner: row.owner,
    invoiceId: row.invoiceId ?? undefined,
    quoteStatus: row.quoteStatus ?? undefined
  };
}

export async function listOrders() {
  noStore();
  const userId = await requireUserId();
  const rows = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return rows.map(toOrder);
}

export async function getOrder(id: string) {
  noStore();
  const userId = await requireUserId();
  const row = await prisma.order.findFirst({ where: { id, userId } });

  return row ? toOrder(row) : undefined;
}

export async function getInvoicePdf(
  invoiceId: string
): Promise<{ bytes: Uint8Array; filename: string } | undefined> {
  noStore();
  const userId = await requireUserId();
  const row = await prisma.order.findFirst({ where: { invoiceId, userId } });

  if (!row) {
    return undefined;
  }

  const bytes = await buildInvoicePdf(row);
  return { bytes, filename: `${invoiceId}.pdf` };
}

async function buildInvoicePdf(row: OrderRow): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${row.invoiceId ?? row.id}`);

  const page = doc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.08, 0.07, 0.12);
  const muted = rgb(0.42, 0.4, 0.48);
  const line = rgb(0.86, 0.85, 0.89);
  const lime = rgb(0.62, 0.85, 0.1);
  const white = rgb(1, 1, 1);
  const M = 56;

  const rightX = (text: string, size: number, font = bold) =>
    width - M - font.widthOfTextAtSize(text, size);

  // Header band
  page.drawRectangle({ x: 0, y: height - 130, width, height: 130, color: ink });
  page.drawText("Influencer Outreach", { x: M, y: height - 62, size: 21, font: bold, color: white });
  page.drawText("Solutions", { x: M, y: height - 86, size: 21, font: bold, color: lime });
  page.drawText("INVOICE", { x: rightX("INVOICE", 26), y: height - 70, size: 26, font: bold, color: white });

  // Billed to
  page.drawText("BILLED TO", { x: M, y: 612, size: 9, font: bold, color: muted });
  page.drawText(row.userEmail ?? "Account holder", { x: M, y: 594, size: 12, font: helv, color: ink });

  // Meta (right column)
  const issued = row.completedAt ?? new Date();
  const meta: [string, string][] = [
    ["Invoice", row.invoiceId ?? "—"],
    ["Order", row.id],
    ["Issued", formatDate(issued)],
    ["Status", row.status]
  ];
  let my = 612;
  for (const [label, value] of meta) {
    const v = value.length > 30 ? `${value.slice(0, 29)}…` : value;
    page.drawText(label.toUpperCase(), { x: width - M - 230, y: my, size: 9, font: bold, color: muted });
    page.drawText(v, { x: width - M - 150, y: my, size: 10, font: helv, color: ink });
    my -= 17;
  }

  // Items table
  let y = 520;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: line });
  y -= 20;
  page.drawText("DESCRIPTION", { x: M, y, size: 9, font: bold, color: muted });
  page.drawText("AMOUNT", { x: rightX("AMOUNT", 9), y, size: 9, font: bold, color: muted });
  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: line });

  y -= 28;
  const amount = `$${row.amount.toLocaleString("en-US")}`;
  page.drawText(row.service, { x: M, y, size: 12, font: bold, color: ink });
  page.drawText(amount, { x: rightX(amount, 12), y, size: 12, font: bold, color: ink });
  y -= 17;
  const sub = row.packageName
    ? `${row.category} · ${row.packageName}${row.billing === "monthly" ? " · billed monthly" : ""}`
    : row.category;
  page.drawText(sub, { x: M, y, size: 10, font: helv, color: muted });

  // Total
  y -= 40;
  page.drawLine({ start: { x: width / 2, y: y + 16 }, end: { x: width - M, y: y + 16 }, thickness: 1, color: line });
  page.drawText("Total", { x: width / 2, y, size: 12, font: bold, color: muted });
  const total = `$${row.amount.toLocaleString("en-US")}`;
  page.drawText(total, { x: rightX(total, 16), y: y - 2, size: 16, font: bold, color: ink });

  // Footer
  page.drawLine({ start: { x: M, y: 110 }, end: { x: width - M, y: 110 }, thickness: 1, color: line });
  page.drawText("Thank you for working with Influencer Outreach Solutions.", {
    x: M,
    y: 90,
    size: 10,
    font: helv,
    color: muted
  });
  page.drawText("outreachinfluencers.com", { x: M, y: 74, size: 10, font: bold, color: ink });

  return doc.save();
}

export async function getDashboardData() {
  const orders = await listOrders();
  const activeOrders = orders.filter((order) => order.status !== "Completed");
  const completedOrders = orders.filter((order) => order.status === "Completed");
  const averageProgress = activeOrders.length
    ? Math.round(activeOrders.reduce((sum, order) => sum + order.progress, 0) / activeOrders.length)
    : 0;

  const stats: DashboardStat[] = [
    {
      label: "Current orders",
      value: activeOrders.length.toString(),
      detail: `${activeOrders.length} services in delivery`,
      tone: "violet"
    },
    {
      label: "Completed orders",
      value: completedOrders.length.toString(),
      detail: `$${completedOrders.reduce((sum, order) => sum + order.amount, 0).toLocaleString("en-US")} delivered`,
      tone: "ink"
    },
    {
      label: "Avg. progress",
      value: `${averageProgress}%`,
      detail: "Across active work",
      tone: "coral"
    }
  ];

  return {
    orders,
    activeOrders,
    completedOrders,
    stats
  };
}

export async function createOrder(input: CreateOrderInput) {
  noStore();
  const userId = await requireUserId();
  const service = serviceOptions.find((option) => option.name === input.category);
  const orderedAt = new Date();
  const dueAt = new Date(orderedAt);
  dueAt.setDate(orderedAt.getDate() + deliveryDays(input.deliveryWindow));

  const row = await prisma.order.create({
    data: {
      userId,
      service: input.service.trim() || `${input.category} order`,
      category: input.category,
      status: "Brief received",
      orderedAt,
      dueAt,
      amount: service?.startingPrice ?? 500,
      progress: 12,
      targetUrl: input.targetUrl.trim(),
      deliverables: [
        "Brief received by fulfilment team",
        `Budget range: ${input.budgetRange}`,
        input.brief.trim() ? `Client note: ${input.brief.trim().slice(0, 96)}` : "Team review pending"
      ],
      owner: "Client Success"
    }
  });

  return toOrder(row);
}

// ---------------------------------------------------------------------------
// Cart checkout — one Order per line item. This function is the Stripe seam:
// a future version creates a Checkout Session here and defers order creation
// to a webhook on successful payment.
// ---------------------------------------------------------------------------

export type CartLine = { id: string; quantity: number };
export type CheckoutInput = { lines: CartLine[]; targetUrl: string; brief?: string };

export async function createOrdersFromCart(input: CheckoutInput) {
  noStore();
  const userId = await requireUserId();
  const email = await currentUserEmail();
  const targetUrl = input.targetUrl.trim();

  if (!targetUrl) {
    throw new Error("Target URL is required.");
  }

  const resolved = input.lines
    .map((line) => ({ line, buyable: findBuyable(line.id) }))
    .filter(
      (entry): entry is { line: CartLine; buyable: NonNullable<ReturnType<typeof findBuyable>> } =>
        Boolean(entry.buyable)
    );

  if (resolved.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const now = new Date();

  const created = await prisma.$transaction(
    resolved.map(({ line, buyable }) => {
      const quantity = Math.max(1, Math.min(99, Math.round(line.quantity || 1)));
      const dueAt = new Date(now);
      dueAt.setDate(now.getDate() + leadDaysForCategory(buyable.service.category));
      const label = quantity > 1 ? `${buyable.name} ×${quantity}` : buyable.name;

      return prisma.order.create({
        data: {
          userId,
          userEmail: email,
          service: `${buyable.service.name} — ${label}`,
          category: buyable.service.category,
          packageId: buyable.id,
          packageName: buyable.name,
          billing: buyable.billing,
          status: "Brief received",
          orderedAt: now,
          dueAt,
          amount: buyable.price * quantity,
          progress: 12,
          targetUrl,
          deliverables: [
            `${buyable.name} — ${buyable.description}`,
            ...(quantity > 1 ? [`Quantity: ${quantity}`] : []),
            input.brief?.trim()
              ? `Client note: ${input.brief.trim().slice(0, 120)}`
              : "Brief received by fulfilment team"
          ],
          owner: "Client Success"
        }
      });
    })
  );

  return created.map(toOrder);
}

export type QuoteRequestInput = { slug: string; targetUrl: string; brief?: string };

export async function createQuoteRequest(input: QuoteRequestInput) {
  noStore();
  const userId = await requireUserId();
  const email = await currentUserEmail();
  const service = catalogBySlug(input.slug);

  if (!service) {
    throw new Error("Unknown service.");
  }

  const targetUrl = input.targetUrl.trim();

  if (!targetUrl) {
    throw new Error("Target URL is required.");
  }

  const now = new Date();
  const dueAt = new Date(now);
  dueAt.setDate(now.getDate() + leadDaysForCategory(service.category));

  const row = await prisma.order.create({
    data: {
      userId,
      userEmail: email,
      service: `${service.name} — Quote request`,
      category: service.category,
      billing: "one_time",
      quoteStatus: "requested",
      status: "Brief received",
      orderedAt: now,
      dueAt,
      amount: 0,
      progress: 5,
      targetUrl,
      deliverables: [
        "Quote requested — pending pricing from the team",
        input.brief?.trim() ? `Client note: ${input.brief.trim().slice(0, 120)}` : "Awaiting scope details"
      ],
      owner: "Client Success"
    }
  });

  return toOrder(row);
}

// ---------------------------------------------------------------------------
// Client-facing single order with its update timeline.
// ---------------------------------------------------------------------------

export type OrderUpdateEntry = {
  id: string;
  body: string;
  status?: string;
  authorName: string;
  createdAt: string;
};

export type OrderDetail = { order: Order; updates: OrderUpdateEntry[] };

export async function getOrderDetail(id: string): Promise<OrderDetail | undefined> {
  noStore();
  const userId = await requireUserId();
  const row = await prisma.order.findFirst({
    where: { id, userId },
    include: { updates: { orderBy: { createdAt: "desc" } } }
  });

  if (!row) {
    return undefined;
  }

  return { order: toOrder(row), updates: row.updates.map(toUpdateEntry) };
}

export async function acceptQuote(orderId: string): Promise<Order> {
  noStore();
  const userId = await requireUserId();
  const user = await currentUser();
  const existing = await prisma.order.findFirst({ where: { id: orderId, userId } });

  if (!existing) {
    throw new Error("Order not found.");
  }
  if (existing.quoteStatus !== "quoted") {
    throw new Error("This quote isn't ready to accept yet.");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { quoteStatus: "accepted" }
  });

  const clientName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Client";

  await prisma.orderUpdate.create({
    data: {
      orderId,
      authorId: userId,
      authorName: clientName,
      body: `Quote of $${updated.amount.toLocaleString("en-US")} accepted.`
    }
  });

  return toOrder(updated);
}

export type NotificationItem = {
  id: string;
  orderId: string;
  service: string;
  body: string;
  status?: string;
  createdAtISO: string;
  createdAtLabel: string;
};

export async function listRecentUpdatesForUser(limit = 12): Promise<NotificationItem[]> {
  noStore();
  const userId = await requireUserId();
  const rows = await prisma.orderUpdate.findMany({
    where: { order: { userId } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { order: { select: { id: true, service: true } } }
  });

  return rows.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    service: row.order.service,
    body: row.body,
    status: row.status ?? undefined,
    createdAtISO: row.createdAt.toISOString(),
    createdAtLabel: formatDateTime(row.createdAt)
  }));
}

// ---------------------------------------------------------------------------
// Admin — full visibility + status / progress / update mutations.
// ---------------------------------------------------------------------------

export type AdminOrder = Order & {
  userId: string;
  userEmail?: string;
  quoteStatus?: string;
  billing: string;
  packageName?: string;
  createdAtLabel: string;
};

export type AdminOrderDetail = { order: AdminOrder; updates: OrderUpdateEntry[] };

export type OrderMutationInput = {
  status?: OrderStatus;
  progress?: number;
  amount?: number;
  quoteStatus?: string;
  note?: string;
};

export async function listAllOrders(): Promise<AdminOrder[]> {
  noStore();
  await requireAdmin();
  const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toAdminOrder);
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | undefined> {
  noStore();
  await requireAdmin();
  const row = await prisma.order.findUnique({
    where: { id },
    include: { updates: { orderBy: { createdAt: "desc" } } }
  });

  if (!row) {
    return undefined;
  }

  return { order: toAdminOrder(row), updates: row.updates.map(toUpdateEntry) };
}

export async function updateOrder(orderId: string, input: OrderMutationInput): Promise<AdminOrder> {
  noStore();
  const adminId = await requireAdmin();
  const admin = await currentUser();

  const existing = await prisma.order.findUnique({ where: { id: orderId } });

  if (!existing) {
    throw new Error("Order not found.");
  }

  const completing = input.status === "Completed";

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(typeof input.progress === "number"
        ? { progress: Math.max(0, Math.min(100, Math.round(input.progress))) }
        : {}),
      ...(typeof input.amount === "number" ? { amount: Math.max(0, Math.round(input.amount)) } : {}),
      ...(input.quoteStatus ? { quoteStatus: input.quoteStatus } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(completing
        ? {
            completedAt: new Date(),
            progress: 100,
            ...(existing.invoiceId ? {} : { invoiceId: `INV-${existing.id}` })
          }
        : {})
    }
  });

  const noteParts: string[] = [];
  if (input.status && input.status !== existing.status) {
    noteParts.push(`Status moved to “${input.status}”.`);
  }
  if (input.note?.trim()) {
    noteParts.push(input.note.trim());
  }

  if (noteParts.length > 0) {
    await prisma.orderUpdate.create({
      data: {
        orderId,
        authorId: adminId,
        authorName: adminName(admin),
        body: noteParts.join(" "),
        status: input.status ?? null
      }
    });
  }

  return toAdminOrder(updated);
}

export async function addOrderUpdate(orderId: string, body: string): Promise<OrderUpdateEntry> {
  noStore();
  const adminId = await requireAdmin();
  const admin = await currentUser();
  const text = body.trim();

  if (!text) {
    throw new Error("Update cannot be empty.");
  }

  const existing = await prisma.order.findUnique({ where: { id: orderId } });

  if (!existing) {
    throw new Error("Order not found.");
  }

  const row = await prisma.orderUpdate.create({
    data: { orderId, authorId: adminId, authorName: adminName(admin), body: text }
  });

  return toUpdateEntry(row);
}

function toAdminOrder(row: OrderRow): AdminOrder {
  return {
    ...toOrder(row),
    userId: row.userId,
    userEmail: row.userEmail ?? undefined,
    quoteStatus: row.quoteStatus ?? undefined,
    billing: row.billing,
    packageName: row.packageName ?? undefined,
    createdAtLabel: formatDate(row.createdAt)
  };
}

function toUpdateEntry(row: OrderUpdateRow): OrderUpdateEntry {
  return {
    id: row.id,
    body: row.body,
    status: row.status ?? undefined,
    authorName: row.authorName,
    createdAt: formatDateTime(row.createdAt)
  };
}

async function currentUserEmail(): Promise<string | undefined> {
  const user = await currentUser();
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    undefined
  );
}

function adminName(user: Awaited<ReturnType<typeof currentUser>>): string {
  if (!user) {
    return "Influencer Outreach";
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.primaryEmailAddress?.emailAddress || "Influencer Outreach";
}

function leadDaysForCategory(category: Order["category"]): number {
  switch (category) {
    case "Digital PR":
      return 21;
    case "AI SEO":
      return 21;
    case "Grow":
      return 30;
    default:
      return 14;
  }
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function parseCreateOrderInput(source: FormData | Record<string, unknown>): CreateOrderInput {
  const get = (key: string) => source instanceof FormData ? source.get(key) : source[key];
  const category = String(get("category") || "Link Building");
  const deliveryWindow = String(get("deliveryWindow") || "standard");

  if (!isCategory(category)) {
    throw new Error("Invalid service category.");
  }

  if (!isDeliveryWindow(deliveryWindow)) {
    throw new Error("Invalid delivery window.");
  }

  const parsed = {
    category,
    service: String(get("service") || "").trim(),
    targetUrl: String(get("targetUrl") || "").trim(),
    deliveryWindow,
    budgetRange: String(get("budgetRange") || "1000-2500"),
    brief: String(get("brief") || "").trim()
  };

  if (!parsed.service) {
    throw new Error("Campaign name is required.");
  }

  if (!parsed.targetUrl) {
    throw new Error("Target URL is required.");
  }

  return parsed;
}

function isCategory(value: string): value is Order["category"] {
  return serviceOptions.some((option) => option.name === value);
}

function isDeliveryWindow(value: string): value is CreateOrderInput["deliveryWindow"] {
  return value === "standard" || value === "priority" || value === "managed";
}

function deliveryDays(value: CreateOrderInput["deliveryWindow"]) {
  if (value === "priority") {
    return 10;
  }

  if (value === "managed") {
    return 30;
  }

  return 21;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
