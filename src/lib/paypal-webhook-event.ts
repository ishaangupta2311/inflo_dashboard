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
  if (!capturedValue || !capturedCurrency) return false;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(capturedValue.trim());
  if (!match) return false;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return (
    Number.isSafeInteger(cents) &&
    cents === expectedAmount * 100 &&
    capturedCurrency.toUpperCase() === expectedCurrency.toUpperCase()
  );
}
