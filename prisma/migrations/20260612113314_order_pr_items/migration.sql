-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "prDelivered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prTotal" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "order_pr_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "docUrl" TEXT NOT NULL DEFAULT '',
    "publishDate" TEXT NOT NULL DEFAULT '',
    "excelUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pr_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_pr_items_orderId_idx" ON "order_pr_items"("orderId");

-- AddForeignKey
ALTER TABLE "order_pr_items" ADD CONSTRAINT "order_pr_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
