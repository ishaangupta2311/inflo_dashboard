-- CreateTable
CREATE TABLE "paypal_checkouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT,
    "lines" JSONB NOT NULL,
    "brief" TEXT,
    "expectedAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paypalOrderId" TEXT,
    "captureId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "lastEventType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paypal_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paypal_checkouts_paypalOrderId_key" ON "paypal_checkouts"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "paypal_checkouts_captureId_key" ON "paypal_checkouts"("captureId");

-- CreateIndex
CREATE INDEX "paypal_checkouts_userId_idx" ON "paypal_checkouts"("userId");

-- CreateIndex
CREATE INDEX "paypal_checkouts_status_idx" ON "paypal_checkouts"("status");
