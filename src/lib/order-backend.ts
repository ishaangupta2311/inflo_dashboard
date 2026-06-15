import { unstable_noStore as noStore } from "next/cache";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { catalogBySlug, findBuyable, type Buyable } from "@/lib/catalog";
import { serviceOptions, type Order, type OrderStatus } from "@/lib/orders";
import type {
  Order as OrderRow,
  OrderLink as OrderLinkRow,
  OrderPrItem as OrderPrItemRow,
  OrderUpdate as OrderUpdateRow
} from "@/generated/prisma/client";

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
    linkTotal: row.linkTotal,
    linksDelivered: row.linksDelivered,
    prTotal: row.prTotal,
    prDelivered: row.prDelivered,
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
export type CheckoutInput = { lines: CartLine[]; targetUrl?: string; brief?: string };

type ResolvedLine = { buyable: Buyable; quantity: number };

function summariseLines(lines: ResolvedLine[]): string {
  return lines
    .map(({ buyable, quantity }) => (quantity > 1 ? `${buyable.name} ×${quantity}` : buyable.name))
    .join(", ");
}

export async function createOrdersFromCart(input: CheckoutInput) {
  noStore();
  const userId = await requireUserId();
  const email = await currentUserEmail();
  // Target URL is no longer collected at checkout — link orders capture the
  // landing page per placement, and other orders use the brief.
  const targetUrl = input.targetUrl?.trim() ?? "";

  const resolved: ResolvedLine[] = input.lines
    .map((line) => ({ buyable: findBuyable(line.id), quantity: Math.max(1, Math.min(99, Math.round(line.quantity || 1))) }))
    .filter((entry): entry is ResolvedLine => Boolean(entry.buyable));

  if (resolved.length === 0) {
    throw new Error("Your cart is empty.");
  }

  // One order per catalog service — all lines of the same service consolidate together.
  const groups = new Map<string, ResolvedLine[]>();
  for (const entry of resolved) {
    const key = entry.buyable.service.slug;
    const existing = groups.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  const now = new Date();
  const briefNote = input.brief?.trim() ? `Client note: ${input.brief.trim().slice(0, 120)}` : undefined;

  const created = await prisma.$transaction(
    [...groups.values()].map((lines) => {
      const service = lines[0].buyable.service;
      const amount = lines.reduce((sum, { buyable, quantity }) => sum + buyable.price * quantity, 0);
      const billing = lines.some(({ buyable }) => buyable.billing === "monthly") ? "monthly" : "one_time";
      const packageId = lines.length === 1 ? lines[0].buyable.id : null;
      const dueAt = new Date(now);
      dueAt.setDate(now.getDate() + leadDaysForCategory(service.category));

      // Link Building & AI SEO brand mentions: expand every unit into an
      // individual placement row (both render as a per-row table, not %).
      if (service.category === "Link Building" || service.category === "AI SEO") {
        const linkRows = lines
          .flatMap(({ buyable, quantity }) =>
            Array.from({ length: quantity * buyable.links }, () => buyable.dr)
          )
          .map((orderedDr, index) => ({ position: index + 1, orderedDr }));

        return prisma.order.create({
          data: {
            userId,
            userEmail: email,
            service: `${service.name} — ${linkRows.length} ${linkRows.length === 1 ? "placement" : "placements"}`,
            category: service.category,
            packageId,
            packageName: summariseLines(lines),
            billing,
            status: "Brief received",
            orderedAt: now,
            dueAt,
            amount,
            progress: 0,
            linkTotal: linkRows.length,
            linksDelivered: 0,
            targetUrl,
            deliverables: briefNote ? [briefNote] : [],
            owner: "Client Success",
            links: { create: linkRows }
          }
        });
      }

      // Digital PR: expand every unit into an individual media-feature row.
      if (service.category === "Digital PR") {
        const featureCount = lines.reduce(
          (sum, { buyable, quantity }) => sum + quantity * buyable.prFeatures,
          0
        );

        // featureCount 0 only happens for a misconfigured PR buyable — fall
        // through to the consolidated deliverables order rather than an empty one.
        if (featureCount > 0) {
          const prRows = Array.from({ length: featureCount }, (_, index) => ({ position: index + 1 }));

          return prisma.order.create({
            data: {
              userId,
              userEmail: email,
              service: `${service.name} — ${prRows.length} ${prRows.length === 1 ? "feature" : "features"}`,
              category: service.category,
              packageId,
              packageName: summariseLines(lines),
              billing,
              status: "Brief received",
              orderedAt: now,
              dueAt,
              amount,
              progress: 0,
              prTotal: prRows.length,
              prDelivered: 0,
              targetUrl,
              deliverables: briefNote ? [briefNote] : [],
              owner: "Client Success",
              prItems: { create: prRows }
            }
          });
        }
      }

      // Everything else: a single consolidated, deliverables-style order.
      return prisma.order.create({
        data: {
          userId,
          userEmail: email,
          service: `${service.name} — ${summariseLines(lines)}`,
          category: service.category,
          packageId,
          packageName: summariseLines(lines),
          billing,
          status: "Brief received",
          orderedAt: now,
          dueAt,
          amount,
          progress: 12,
          targetUrl,
          deliverables: [
            ...lines.map(
              ({ buyable, quantity }) =>
                `${buyable.name}${quantity > 1 ? ` ×${quantity}` : ""} — ${buyable.description}`
            ),
            briefNote ?? "Brief received by fulfilment team"
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

export type OrderLinkEntry = {
  id: string;
  position: number;
  orderedDr: string;
  anchorText: string;
  landingPage: string;
  prospectUrl: string;
  deliveredDr: string;
  traffic: string;
  publishUrl: string;
  delivered: boolean;
};

export type OrderPrItemEntry = {
  id: string;
  position: number;
  title: string;
  docUrl: string;
  publishDate: string;
  excelUrl: string;
  delivered: boolean;
};

export type OrderDetail = {
  order: Order;
  updates: OrderUpdateEntry[];
  links: OrderLinkEntry[];
  prItems: OrderPrItemEntry[];
};

export async function getOrderDetail(id: string): Promise<OrderDetail | undefined> {
  noStore();
  const userId = await requireUserId();
  const row = await prisma.order.findFirst({
    where: { id, userId },
    include: {
      updates: { orderBy: { createdAt: "desc" } },
      links: { orderBy: { position: "asc" } },
      prItems: { orderBy: { position: "asc" } }
    }
  });

  if (!row) {
    return undefined;
  }

  return {
    order: toOrder(row),
    updates: row.updates.map(toUpdateEntry),
    links: row.links.map(toOrderLink),
    prItems: row.prItems.map(toPrItem)
  };
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
  // Only surface updates made by staff — the client doesn't need to be notified
  // of their own edits.
  const rows = await prisma.orderUpdate.findMany({
    where: { order: { userId }, authorId: { not: userId } },
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

// Staff notifications feed: recent updates authored by clients (the order owner),
// across every order — i.e. "a client changed something." An update is
// client-authored when its author is the order's owner.
export async function listRecentUpdatesForStaff(limit = 12): Promise<NotificationItem[]> {
  noStore();
  await requireStaff();
  const rows = await prisma.orderUpdate.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { order: { select: { id: true, service: true, userId: true } } }
  });

  return rows
    .filter((row) => row.authorId === row.order.userId)
    .slice(0, limit)
    .map((row) => ({
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

export type AdminOrderDetail = {
  order: AdminOrder;
  updates: OrderUpdateEntry[];
  links: OrderLinkEntry[];
  prItems: OrderPrItemEntry[];
};

export type OrderMutationInput = {
  status?: OrderStatus;
  progress?: number;
  amount?: number;
  quoteStatus?: string;
  note?: string;
};

export async function listAllOrders(): Promise<AdminOrder[]> {
  noStore();
  await requireStaff();
  const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toAdminOrder);
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | undefined> {
  noStore();
  await requireStaff();
  const row = await prisma.order.findUnique({
    where: { id },
    include: {
      updates: { orderBy: { createdAt: "desc" } },
      links: { orderBy: { position: "asc" } },
      prItems: { orderBy: { position: "asc" } }
    }
  });

  if (!row) {
    return undefined;
  }

  return {
    order: toAdminOrder(row),
    updates: row.updates.map(toUpdateEntry),
    links: row.links.map(toOrderLink),
    prItems: row.prItems.map(toPrItem)
  };
}

export async function updateOrder(orderId: string, input: OrderMutationInput): Promise<AdminOrder> {
  noStore();
  const { userId: adminId } = await requireStaff();
  const admin = await currentUser();

  const existing = await prisma.order.findUnique({ where: { id: orderId } });

  if (!existing) {
    throw new Error("Order not found.");
  }

  const completing = input.status === "Completed";

  if (completing && existing.linkTotal > 0 && existing.linksDelivered < existing.linkTotal) {
    const noun = existing.category === "AI SEO" ? "mentions" : "links";
    throw new Error(
      `Can't complete yet — ${existing.linksDelivered} of ${existing.linkTotal} ${noun} delivered. Add a publish link to every row first.`
    );
  }

  if (completing && existing.prTotal > 0 && existing.prDelivered < existing.prTotal) {
    throw new Error(
      `Can't complete yet — ${existing.prDelivered} of ${existing.prTotal} features published. Set a publish date on every row first.`
    );
  }

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
  const { userId: adminId } = await requireStaff();
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

// ---------------------------------------------------------------------------
// Per-link editing — clients own anchor text + landing page; staff own the
// prospect / delivered DR / traffic / publish columns. Every write is scoped to
// { id, orderId } so a link id from another order can never be touched.
// ---------------------------------------------------------------------------

export type ClientLinkEdit = { id: string; anchorText: string; landingPage: string };
export type AdminLinkEdit = {
  id: string;
  anchorText: string;
  landingPage: string;
  prospectUrl: string;
  deliveredDr: string;
  traffic: string;
  publishUrl: string;
};

// Status order, used to advance a link order forward without ever moving it back.
const STATUS_FLOW: OrderStatus[] = [
  "Brief received",
  "In outreach",
  "Content review",
  "Publishing",
  "Completed"
];

// Derive a link order's status purely from what staff have filled in:
// nothing yet → Brief received; prospect sites added → In outreach;
// first link published → Publishing; every link published → Completed.
function deriveLinkStatus(rows: { publishUrl: string; prospectUrl: string }[]): OrderStatus {
  const total = rows.length;
  const delivered = rows.filter((r) => r.publishUrl.trim() !== "").length;
  const started = rows.filter((r) => r.prospectUrl.trim() !== "").length;

  if (total > 0 && delivered === total) return "Completed";
  if (delivered > 0) return "Publishing";
  if (started > 0) return "In outreach";
  return "Brief received";
}

// Recompute delivered counts/progress and auto-advance the status (forward only).
// Admins can still override the status manually via the Manage order form.
async function applyLinkProgress(
  orderId: string,
  adminId: string,
  admin: Awaited<ReturnType<typeof currentUser>>
): Promise<void> {
  const rows = await prisma.orderLink.findMany({
    where: { orderId },
    select: { publishUrl: true, prospectUrl: true }
  });
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    return;
  }

  const total = rows.length;
  const delivered = rows.filter((r) => r.publishUrl.trim() !== "").length;

  const derived = deriveLinkStatus(rows);
  const advancing = STATUS_FLOW.indexOf(derived) > STATUS_FLOW.indexOf(order.status as OrderStatus);
  const nextStatus = advancing ? derived : (order.status as OrderStatus);
  const completing = advancing && nextStatus === "Completed";

  await prisma.order.update({
    where: { id: orderId },
    data: {
      linkTotal: total,
      linksDelivered: delivered,
      progress: total ? Math.round((delivered / total) * 100) : 0,
      ...(advancing ? { status: nextStatus } : {}),
      ...(completing
        ? {
            completedAt: new Date(),
            progress: 100,
            ...(order.invoiceId ? {} : { invoiceId: `INV-${order.id}` })
          }
        : {})
    }
  });

  if (advancing) {
    await prisma.orderUpdate.create({
      data: {
        orderId,
        authorId: adminId,
        authorName: adminName(admin),
        body: `Status moved to “${nextStatus}”.`,
        status: nextStatus
      }
    });
  }
}

const CLIENT_LINK_FIELDS = [
  { key: "anchorText", label: "anchor text" },
  { key: "landingPage", label: "landing page" }
] as const;

const ADMIN_LINK_FIELDS = [
  { key: "anchorText", label: "anchor text" },
  { key: "landingPage", label: "landing page" },
  { key: "prospectUrl", label: "prospect URL" },
  { key: "deliveredDr", label: "DR delivering" },
  { key: "traffic", label: "traffic" },
  { key: "publishUrl", label: "publish link" }
] as const;

function truncateValue(value: string): string {
  return value.length > 80 ? `${value.slice(0, 79)}…` : value;
}

// Build a human-readable summary of exactly which row fields changed — e.g.
// "Link #1: DR delivering set to “77”." — used as the timeline / notification body.
// `noun` labels the row ("Link", "PR feature").
function summariseRowEdits(
  edits: readonly { id: string }[],
  prior: ReadonlyMap<string, { position: number }>,
  fields: readonly { key: string; label: string }[],
  noun = "Link"
): string {
  const entries: string[] = [];
  for (const edit of edits) {
    const was = prior.get(edit.id);
    if (!was) {
      continue;
    }
    const editRec = edit as Record<string, unknown>;
    const wasRec = was as Record<string, unknown>;
    const changes: string[] = [];
    for (const { key, label } of fields) {
      const next = String(editRec[key] ?? "").trim();
      const prev = String(wasRec[key] ?? "").trim();
      if (next === prev) {
        continue;
      }
      changes.push(next === "" ? `${label} cleared` : `${label} set to “${truncateValue(next)}”`);
    }
    if (changes.length > 0) {
      entries.push(`${noun} #${was.position}: ${changes.join(", ")}`);
    }
  }
  return entries.length > 0 ? `${entries.join(". ")}.` : "";
}

export async function updateOrderLinksClient(input: {
  orderId: string;
  links: ClientLinkEdit[];
}): Promise<void> {
  noStore();
  const userId = await requireUserId();
  const user = await currentUser();
  const order = await prisma.order.findFirst({ where: { id: input.orderId, userId } });

  if (!order) {
    throw new Error("Order not found.");
  }

  const before = await prisma.orderLink.findMany({
    where: { id: { in: input.links.map((l) => l.id) }, orderId: input.orderId },
    select: { id: true, position: true, anchorText: true, landingPage: true }
  });
  const prior = new Map(before.map((l) => [l.id, l]));

  await prisma.$transaction(
    input.links.map((link) =>
      prisma.orderLink.updateMany({
        where: { id: link.id, orderId: input.orderId },
        data: { anchorText: link.anchorText.trim(), landingPage: link.landingPage.trim() }
      })
    )
  );

  // Notify staff exactly what the client changed.
  const summary = summariseRowEdits(input.links, prior, CLIENT_LINK_FIELDS);
  if (summary) {
    await prisma.orderUpdate.create({
      data: { orderId: input.orderId, authorId: userId, authorName: clientDisplayName(user), body: summary }
    });
  }
}

export async function updateOrderLinksAdmin(input: {
  orderId: string;
  links: AdminLinkEdit[];
}): Promise<void> {
  noStore();
  const { userId: adminId } = await requireStaff();
  const admin = await currentUser();
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });

  if (!order) {
    throw new Error("Order not found.");
  }

  const before = await prisma.orderLink.findMany({
    where: { id: { in: input.links.map((l) => l.id) }, orderId: input.orderId },
    select: {
      id: true,
      position: true,
      anchorText: true,
      landingPage: true,
      prospectUrl: true,
      deliveredDr: true,
      traffic: true,
      publishUrl: true
    }
  });
  const prior = new Map(before.map((l) => [l.id, l]));

  await prisma.$transaction(
    input.links.map((link) =>
      prisma.orderLink.updateMany({
        where: { id: link.id, orderId: input.orderId },
        data: {
          anchorText: link.anchorText.trim(),
          landingPage: link.landingPage.trim(),
          prospectUrl: link.prospectUrl.trim(),
          deliveredDr: link.deliveredDr.trim(),
          traffic: link.traffic.trim(),
          publishUrl: link.publishUrl.trim()
        }
      })
    )
  );

  // Notify the client exactly what we changed.
  const summary = summariseRowEdits(input.links, prior, ADMIN_LINK_FIELDS);
  if (summary) {
    await prisma.orderUpdate.create({
      data: { orderId: input.orderId, authorId: adminId, authorName: adminName(admin), body: summary }
    });
  }

  // Recompute delivered counts and auto-advance status (posts its own note on change).
  await applyLinkProgress(input.orderId, adminId, admin);
}

// ---------------------------------------------------------------------------
// Per-feature editing (Digital PR) — every column is staff-owned; the client
// views them read-only. A non-empty publish date marks a feature published.
// ---------------------------------------------------------------------------

export type AdminPrEdit = {
  id: string;
  title: string;
  docUrl: string;
  publishDate: string;
  excelUrl: string;
};

const ADMIN_PR_FIELDS = [
  { key: "title", label: "title" },
  { key: "docUrl", label: "PR doclink" },
  { key: "publishDate", label: "publish date" },
  { key: "excelUrl", label: "publish excel link" }
] as const;

export type ClientPrEdit = { id: string; title: string; docUrl: string };

const CLIENT_PR_FIELDS = [
  { key: "title", label: "title" },
  { key: "docUrl", label: "PR doclink" }
] as const;

// Derive a PR order's status from publish dates (the staff fulfilment signal):
// nothing published → Brief received; first feature published → Publishing;
// every feature published → Completed. Title/doclink are client inputs, so they
// don't drive status — admins set intermediate stages manually.
function derivePrStatus(rows: { publishDate: string }[]): OrderStatus {
  const total = rows.length;
  const published = rows.filter((r) => r.publishDate.trim() !== "").length;

  if (total > 0 && published === total) return "Completed";
  if (published > 0) return "Publishing";
  return "Brief received";
}

// Recompute published counts/progress and auto-advance status (forward only),
// mirroring applyLinkProgress for Digital PR orders.
async function applyPrProgress(
  orderId: string,
  adminId: string,
  admin: Awaited<ReturnType<typeof currentUser>>
): Promise<void> {
  const rows = await prisma.orderPrItem.findMany({
    where: { orderId },
    select: { publishDate: true }
  });
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    return;
  }

  const total = rows.length;
  const delivered = rows.filter((r) => r.publishDate.trim() !== "").length;

  const derived = derivePrStatus(rows);
  const advancing = STATUS_FLOW.indexOf(derived) > STATUS_FLOW.indexOf(order.status as OrderStatus);
  const nextStatus = advancing ? derived : (order.status as OrderStatus);
  const completing = advancing && nextStatus === "Completed";

  await prisma.order.update({
    where: { id: orderId },
    data: {
      prTotal: total,
      prDelivered: delivered,
      progress: total ? Math.round((delivered / total) * 100) : 0,
      ...(advancing ? { status: nextStatus } : {}),
      ...(completing
        ? {
            completedAt: new Date(),
            progress: 100,
            ...(order.invoiceId ? {} : { invoiceId: `INV-${order.id}` })
          }
        : {})
    }
  });

  if (advancing) {
    await prisma.orderUpdate.create({
      data: {
        orderId,
        authorId: adminId,
        authorName: adminName(admin),
        body: `Status moved to “${nextStatus}”.`,
        status: nextStatus
      }
    });
  }
}

export async function updateOrderPrItemsClient(input: {
  orderId: string;
  items: ClientPrEdit[];
}): Promise<void> {
  noStore();
  const userId = await requireUserId();
  const user = await currentUser();
  const order = await prisma.order.findFirst({ where: { id: input.orderId, userId } });

  if (!order) {
    throw new Error("Order not found.");
  }

  const before = await prisma.orderPrItem.findMany({
    where: { id: { in: input.items.map((i) => i.id) }, orderId: input.orderId },
    select: { id: true, position: true, title: true, docUrl: true }
  });
  const prior = new Map(before.map((i) => [i.id, i]));

  await prisma.$transaction(
    input.items.map((item) =>
      prisma.orderPrItem.updateMany({
        where: { id: item.id, orderId: input.orderId },
        data: { title: item.title.trim(), docUrl: item.docUrl.trim() }
      })
    )
  );

  // Notify staff exactly what the client changed.
  const summary = summariseRowEdits(input.items, prior, CLIENT_PR_FIELDS, "PR feature");
  if (summary) {
    await prisma.orderUpdate.create({
      data: { orderId: input.orderId, authorId: userId, authorName: clientDisplayName(user), body: summary }
    });
  }
}

export async function updateOrderPrItemsAdmin(input: {
  orderId: string;
  items: AdminPrEdit[];
}): Promise<void> {
  noStore();
  const { userId: adminId } = await requireStaff();
  const admin = await currentUser();
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });

  if (!order) {
    throw new Error("Order not found.");
  }

  const before = await prisma.orderPrItem.findMany({
    where: { id: { in: input.items.map((i) => i.id) }, orderId: input.orderId },
    select: { id: true, position: true, title: true, docUrl: true, publishDate: true, excelUrl: true }
  });
  const prior = new Map(before.map((i) => [i.id, i]));

  await prisma.$transaction(
    input.items.map((item) =>
      prisma.orderPrItem.updateMany({
        where: { id: item.id, orderId: input.orderId },
        data: {
          title: item.title.trim(),
          docUrl: item.docUrl.trim(),
          publishDate: item.publishDate.trim(),
          excelUrl: item.excelUrl.trim()
        }
      })
    )
  );

  // Notify the client exactly what we changed.
  const summary = summariseRowEdits(input.items, prior, ADMIN_PR_FIELDS, "PR feature");
  if (summary) {
    await prisma.orderUpdate.create({
      data: { orderId: input.orderId, authorId: adminId, authorName: adminName(admin), body: summary }
    });
  }

  // Recompute published counts and auto-advance status (posts its own note on change).
  await applyPrProgress(input.orderId, adminId, admin);
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

function toOrderLink(row: OrderLinkRow): OrderLinkEntry {
  return {
    id: row.id,
    position: row.position,
    orderedDr: row.orderedDr,
    anchorText: row.anchorText,
    landingPage: row.landingPage,
    prospectUrl: row.prospectUrl,
    deliveredDr: row.deliveredDr,
    traffic: row.traffic,
    publishUrl: row.publishUrl,
    delivered: row.publishUrl.trim() !== ""
  };
}

function toPrItem(row: OrderPrItemRow): OrderPrItemEntry {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    docUrl: row.docUrl,
    publishDate: row.publishDate,
    excelUrl: row.excelUrl,
    delivered: row.publishDate.trim() !== ""
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

function clientDisplayName(user: Awaited<ReturnType<typeof currentUser>>): string {
  if (!user) {
    return "Client";
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.primaryEmailAddress?.emailAddress || "Client";
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
