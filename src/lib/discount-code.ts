export type AppliedDiscount = {
  code: string;
  percentage: number;
};

// Codes are intentionally simple to enter and share. Normalising means codes
// are case-insensitive to clients while remaining unique in the database.
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export function normalizeDiscountCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidDiscountCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

export function isValidDiscountPercentage(value: number): boolean {
  // A 100% discount would create a zero-value PayPal order, which PayPal
  // Checkout cannot capture. Use 99% as the practical ceiling.
  return Number.isInteger(value) && value >= 1 && value <= 99;
}

export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function discountedAmount(amount: number, percentage: number): number {
  if (!isValidDiscountPercentage(percentage)) {
    throw new Error("Discount percentage must be between 1 and 99.");
  }
  return roundCurrency(amount * ((100 - percentage) / 100));
}
