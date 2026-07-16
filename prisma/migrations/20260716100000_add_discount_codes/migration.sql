-- Percentage discounts can produce cent values (for example, 98% off $120 is
-- $2.40), so existing whole-dollar fields become fixed two-decimal amounts.
ALTER TABLE "orders"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING "amount"::DECIMAL(10,2),
  ADD COLUMN "discountCode" TEXT,
  ADD COLUMN "discountPercentage" INTEGER;

ALTER TABLE "paypal_checkouts"
  ALTER COLUMN "expectedAmount" TYPE DECIMAL(10,2) USING "expectedAmount"::DECIMAL(10,2),
  ADD COLUMN "discountCode" TEXT,
  ADD COLUMN "discountPercentage" INTEGER;

CREATE TABLE "discount_codes" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "percentage" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");
