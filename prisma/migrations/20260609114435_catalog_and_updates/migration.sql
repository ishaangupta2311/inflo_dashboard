-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "billing" TEXT NOT NULL DEFAULT 'one_time',
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "packageName" TEXT,
ADD COLUMN     "quoteStatus" TEXT,
ADD COLUMN     "userEmail" TEXT;

-- CreateTable
CREATE TABLE "order_updates" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT 'Influencer Outreach',
    "body" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_updates_orderId_idx" ON "order_updates"("orderId");

-- AddForeignKey
ALTER TABLE "order_updates" ADD CONSTRAINT "order_updates_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
