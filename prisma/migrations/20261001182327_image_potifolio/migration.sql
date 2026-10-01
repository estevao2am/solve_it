/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `portfolio_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "portfolio_items" DROP COLUMN "imageUrl";

-- CreateTable
CREATE TABLE "portfolio_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "portfolioItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_images_portfolioItemId_idx" ON "portfolio_images"("portfolioItemId");

-- AddForeignKey
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_portfolioItemId_fkey" FOREIGN KEY ("portfolioItemId") REFERENCES "portfolio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
