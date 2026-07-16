ALTER TABLE "paypal_checkouts"
  ADD COLUMN "capturedAmount" DECIMAL(10,2),
  ADD COLUMN "refundedAmount" DECIMAL(10,2) DEFAULT 0;

-- Preserve existing completed transactions in the new capture-backed ledger.
UPDATE "paypal_checkouts"
SET "capturedAmount" = "expectedAmount"
WHERE "status" IN ('paid', 'partially_refunded', 'refunded');

UPDATE "paypal_checkouts"
SET "refundedAmount" = CASE
  WHEN "status" = 'refunded' THEN "expectedAmount"
  WHEN "status" = 'partially_refunded' THEN NULL
  ELSE 0
END
WHERE "status" IN ('paid', 'partially_refunded', 'refunded');

CREATE INDEX "paypal_checkouts_capturedAmount_idx"
  ON "paypal_checkouts"("capturedAmount");

CREATE TABLE "discount_validation_limits" (
  "key" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "discount_validation_limits_pkey" PRIMARY KEY ("key")
);
