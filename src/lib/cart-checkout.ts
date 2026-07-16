import type { BillingInterval } from "@/lib/catalog";
import type { Order } from "@/lib/orders";

export type CartLine = { id: string; quantity: number };

export type ClientCheckoutInput = {
  lines: CartLine[];
  brief?: string;
  discountCode?: string;
};

// Immutable catalog data saved before PayPal is opened. Finalization must use
// this snapshot rather than whatever happens to be in the catalog later.
export type CartSnapshotLine = {
  id: string;
  quantity: number;
  unitPrice: number;
  name: string;
  description: string;
  billing: BillingInterval;
  serviceSlug: string;
  serviceName: string;
  category: Order["category"];
  links: number;
  dr: string;
  prFeatures: number;
};

const CART_KEYS = new Set(["lines", "brief", "discountCode"]);
const CART_ID = /^[a-z0-9-]{1,64}$/;
const CATEGORIES = new Set<Order["category"]>([
  "Link Building",
  "Digital PR",
  "AI SEO",
  "SEO Reseller",
  "Grow"
]);

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function optionalString(value: unknown, name: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

export function parseCartLines(value: unknown): CartLine[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new Error("Your cart is empty or too large.");
  }

  return value.map((candidate) => {
    const line = record(candidate);
    if (!line || typeof line.id !== "string" || !CART_ID.test(line.id)) {
      throw new Error("Your cart contains an invalid item.");
    }
    if (
      typeof line.quantity !== "number" ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 99
    ) {
      throw new Error("Cart quantities must be whole numbers from 1 to 99.");
    }
    return { id: line.id, quantity: line.quantity };
  });
}

// Server Actions are public endpoints. Reject unexpected fields so a caller
// cannot smuggle server-owned payment or discount state through this boundary.
export function parseClientCheckoutInput(value: unknown): ClientCheckoutInput {
  const input = record(value);
  if (!input || Object.keys(input).some((key) => !CART_KEYS.has(key))) {
    throw new Error("Checkout request is invalid.");
  }

  return {
    lines: parseCartLines(input.lines),
    brief: optionalString(input.brief, "Checkout brief", 4000)?.trim(),
    discountCode: optionalString(input.discountCode, "Discount code", 32)?.trim()
  };
}

function validSnapshotLine(value: unknown): value is CartSnapshotLine {
  const line = record(value);
  return Boolean(
    line &&
      typeof line.id === "string" &&
      CART_ID.test(line.id) &&
      typeof line.quantity === "number" &&
      Number.isInteger(line.quantity) &&
      line.quantity >= 1 &&
      line.quantity <= 99 &&
      typeof line.unitPrice === "number" &&
      Number.isFinite(line.unitPrice) &&
      line.unitPrice > 0 &&
      typeof line.name === "string" &&
      typeof line.description === "string" &&
      (line.billing === "one_time" || line.billing === "monthly") &&
      typeof line.serviceSlug === "string" &&
      typeof line.serviceName === "string" &&
      typeof line.category === "string" &&
      CATEGORIES.has(line.category as Order["category"]) &&
      typeof line.links === "number" &&
      Number.isInteger(line.links) &&
      line.links >= 0 &&
      typeof line.dr === "string" &&
      typeof line.prFeatures === "number" &&
      Number.isInteger(line.prFeatures) &&
      line.prFeatures >= 0
  );
}

export function parseCartSnapshot(value: unknown): CartSnapshotLine[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || !value.every(validSnapshotLine)) {
    return undefined;
  }
  return value;
}

export function currencyCents(amount: number): number {
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("Currency amount is invalid.");
  }
  return cents;
}

// Allocate an already-authorized total across service orders. The last order
// receives any rounding remainder, guaranteeing invoices sum to the capture.
export function allocateChargeAmounts(listAmounts: number[], chargeAmount: number): number[] {
  if (listAmounts.length === 0 || listAmounts.some((amount) => amount <= 0)) {
    throw new Error("Order amounts are invalid.");
  }
  const totalListCents = listAmounts.reduce((sum, amount) => sum + currencyCents(amount), 0);
  const chargeCents = currencyCents(chargeAmount);
  if (chargeCents <= 0 || chargeCents > totalListCents) {
    throw new Error("Checkout total is invalid.");
  }

  let assigned = 0;
  return listAmounts.map((amount, index) => {
    const cents =
      index === listAmounts.length - 1
        ? chargeCents - assigned
        : Math.round((currencyCents(amount) / totalListCents) * chargeCents);
    if (cents <= 0) throw new Error("A checkout service has a zero-value allocation.");
    assigned += cents;
    return cents / 100;
  });
}
