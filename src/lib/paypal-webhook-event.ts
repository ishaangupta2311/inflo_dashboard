export type PaypalWebhookEvent = {
  id: string;
  event_type: string;
  create_time?: string;
  resource?: Record<string, unknown>;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function relatedIds(event: PaypalWebhookEvent): Record<string, unknown> | undefined {
  return record(record(event.resource?.supplementary_data)?.related_ids);
}

export function paypalOrderIdForEvent(event: PaypalWebhookEvent): string | undefined {
  if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
    return text(event.resource?.id);
  }
  return text(relatedIds(event)?.order_id);
}

export function captureIdForEvent(event: PaypalWebhookEvent): string | undefined {
  if (
    event.event_type === "PAYMENT.CAPTURE.COMPLETED" ||
    event.event_type === "PAYMENT.CAPTURE.DENIED"
  ) {
    return text(event.resource?.id);
  }
  return text(relatedIds(event)?.capture_id);
}

export function captureAmountForEvent(
  event: PaypalWebhookEvent
): { value?: string; currency?: string } {
  const amount = record(event.resource?.amount);
  return { value: text(amount?.value), currency: text(amount?.currency_code) };
}

export function capturedAmountMatches(
  expectedAmount: number,
  expectedCurrency: string,
  capturedValue: string | undefined,
  capturedCurrency: string | undefined
): boolean {
  if (!capturedCurrency) return false;
  const parsed = parsePaypalMoney(capturedValue);
  if (parsed === undefined) return false;
  const cents = Math.round(parsed * 100);
  // expectedAmount is a two-decimal currency value. Compare integer cents so
  // common binary floating-point representations (for example 63.65) cannot
  // reject a valid PayPal capture.
  const expectedCents = Math.round(expectedAmount * 100);
  return (
    Number.isSafeInteger(cents) &&
    Number.isSafeInteger(expectedCents) &&
    cents === expectedCents &&
    capturedCurrency.toUpperCase() === expectedCurrency.toUpperCase()
  );
}

export function parsePaypalMoney(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return undefined;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents / 100 : undefined;
}
