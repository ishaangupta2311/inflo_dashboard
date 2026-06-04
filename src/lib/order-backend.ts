import { unstable_noStore as noStore } from "next/cache";
import { serviceOptions, type Order } from "@/lib/orders";

export type CreateOrderInput = {
  category: Order["category"];
  service: string;
  targetUrl: string;
  deliveryWindow: "standard" | "priority" | "managed";
  budgetRange: string;
  brief: string;
};

type OrderStore = {
  orders: Order[];
  nextId: number;
};

type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  tone: "violet" | "ink" | "coral";
};

const globalForOrders = globalThis as typeof globalThis & {
  __infloOrderStore?: OrderStore;
};

function getStore() {
  if (!globalForOrders.__infloOrderStore) {
    globalForOrders.__infloOrderStore = {
      orders: [],
      nextId: 1
    };
  }

  return globalForOrders.__infloOrderStore;
}

export async function listOrders() {
  noStore();
  return getStore().orders;
}

export async function getOrder(id: string) {
  noStore();
  return getStore().orders.find((order) => order.id === id);
}

export async function getInvoice(invoiceId: string) {
  noStore();
  const order = getStore().orders.find((candidate) => candidate.invoiceId === invoiceId);

  if (!order) {
    return undefined;
  }

  return [
    "Influencer Outreach Solutions",
    `Invoice: ${invoiceId}`,
    `Order: ${order.id}`,
    `Service: ${order.service}`,
    `Amount: $${order.amount.toLocaleString("en-US")}`,
    `Completed: ${order.dueAt}`,
    "",
    "Prototype invoice export. Production will return a generated PDF from the billing system."
  ].join("\n");
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
  const store = getStore();
  const service = serviceOptions.find((option) => option.name === input.category);
  const id = `INF-${store.nextId++}`;
  const created = new Date();
  const dueAt = new Date(created);
  dueAt.setDate(created.getDate() + deliveryDays(input.deliveryWindow));

  const order: Order = {
    id,
    service: input.service.trim() || `${input.category} order`,
    category: input.category,
    status: "Brief received",
    orderedAt: formatDate(created),
    dueAt: formatDate(dueAt),
    amount: service?.startingPrice ?? 500,
    progress: 12,
    targetUrl: input.targetUrl.trim(),
    deliverables: [
      "Brief received by fulfilment team",
      `Budget range: ${input.budgetRange}`,
      input.brief.trim() ? `Client note: ${input.brief.trim().slice(0, 96)}` : "Team review pending"
    ],
    owner: "Client Success"
  };

  store.orders = [order, ...store.orders];
  return order;
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
