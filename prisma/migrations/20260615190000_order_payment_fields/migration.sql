-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentRef" TEXT;

-- CreateIndex
CREATE INDEX "orders_paymentRef_idx" ON "orders"("paymentRef");
