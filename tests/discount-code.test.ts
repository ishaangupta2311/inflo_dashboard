import assert from "node:assert/strict";
import test from "node:test";
import {
  discountedAmount,
  isValidDiscountCode,
  isValidDiscountPercentage,
  normalizeDiscountCode
} from "../src/lib/discount-code.ts";

test("normalizes and validates shareable discount codes", () => {
  assert.equal(normalizeDiscountCode("  vip-98 "), "VIP-98");
  assert.equal(isValidDiscountCode("VIP-98"), true);
  assert.equal(isValidDiscountCode("no spaces"), false);
});

test("calculates percentage discounts to cents without losing precision", () => {
  assert.equal(discountedAmount(120, 98), 2.4);
  assert.equal(discountedAmount(95, 33), 63.65);
  assert.equal(discountedAmount(160, 25), 120);
});

test("keeps PayPal orders payable by rejecting 100 percent discounts", () => {
  assert.equal(isValidDiscountPercentage(99), true);
  assert.equal(isValidDiscountPercentage(100), false);
  assert.throws(() => discountedAmount(120, 100));
});
