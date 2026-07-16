import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateChargeAmounts,
  parseClientCheckoutInput
} from "../src/lib/cart-checkout.ts";

test("accepts only the public checkout input shape", () => {
  assert.deepEqual(
    parseClientCheckoutInput({
      lines: [{ id: "lb-dr30", quantity: 2 }],
      brief: "  campaign brief  ",
      discountCode: " vip98 "
    }),
    {
      lines: [{ id: "lb-dr30", quantity: 2 }],
      brief: "campaign brief",
      discountCode: "vip98"
    }
  );
});

test("rejects server-owned payment fields and invalid quantities", () => {
  assert.throws(() =>
    parseClientCheckoutInput({
      lines: [{ id: "lb-dr30", quantity: 1 }],
      payment: { ref: "forged" }
    })
  );
  assert.throws(() =>
    parseClientCheckoutInput({ lines: [{ id: "lb-dr30", quantity: Number.POSITIVE_INFINITY }] })
  );
});

test("allocates service orders to the exact authorized total", () => {
  const allocations = allocateChargeAmounts([120, 499, 999], 16.18);
  assert.equal(allocations.reduce((sum, amount) => sum + amount, 0), 16.18);
  assert.deepEqual(allocations, [1.2, 4.99, 9.99]);
});
