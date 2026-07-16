import test from "node:test";
import assert from "node:assert/strict";
import {
  captureAmountForEvent,
  captureIdForEvent,
  capturedAmountMatches,
  paypalOrderIdForEvent,
  type PaypalWebhookEvent
} from "../src/lib/paypal-webhook-event.ts";

test("extracts completed capture identifiers and amount", () => {
  const event: PaypalWebhookEvent = {
    id: "WH-1",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "CAPTURE-1",
      amount: { value: "125.00", currency_code: "USD" },
      supplementary_data: { related_ids: { order_id: "ORDER-1" } }
    }
  };

  assert.equal(paypalOrderIdForEvent(event), "ORDER-1");
  assert.equal(captureIdForEvent(event), "CAPTURE-1");
  assert.deepEqual(captureAmountForEvent(event), { value: "125.00", currency: "USD" });
});

test("extracts approved order and refund capture identifiers", () => {
  const approved: PaypalWebhookEvent = {
    id: "WH-2",
    event_type: "CHECKOUT.ORDER.APPROVED",
    resource: { id: "ORDER-2" }
  };
  const refunded: PaypalWebhookEvent = {
    id: "WH-3",
    event_type: "PAYMENT.CAPTURE.REFUNDED",
    resource: { supplementary_data: { related_ids: { capture_id: "CAPTURE-2" } } }
  };

  assert.equal(paypalOrderIdForEvent(approved), "ORDER-2");
  assert.equal(captureIdForEvent(refunded), "CAPTURE-2");
});

test("requires both exact amount and matching currency", () => {
  assert.equal(capturedAmountMatches(125, "USD", "125.00", "USD"), true);
  assert.equal(capturedAmountMatches(2.4, "USD", "2.40", "USD"), true);
  assert.equal(capturedAmountMatches(63.65, "USD", "63.65", "USD"), true);
  assert.equal(capturedAmountMatches(125, "USD", "124.99", "USD"), false);
  assert.equal(capturedAmountMatches(125, "USD", "125.00", "EUR"), false);
  assert.equal(capturedAmountMatches(125, "USD", undefined, "USD"), false);
  assert.equal(capturedAmountMatches(125, "USD", "125.001", "USD"), false);
  assert.equal(capturedAmountMatches(125, "USD", "not-a-number", "USD"), false);
});
