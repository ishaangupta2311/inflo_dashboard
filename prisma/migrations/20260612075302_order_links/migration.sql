-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "linkTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "linksDelivered" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "order_links" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "orderedDr" TEXT NOT NULL,
    "anchorText" TEXT NOT NULL DEFAULT '',
    "landingPage" TEXT NOT NULL DEFAULT '',
    "prospectUrl" TEXT NOT NULL DEFAULT '',
    "deliveredDr" TEXT NOT NULL DEFAULT '',
    "traffic" TEXT NOT NULL DEFAULT '',
    "publishUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_links_orderId_idx" ON "order_links"("orderId");

-- AddForeignKey
ALTER TABLE "order_links" ADD CONSTRAINT "order_links_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
