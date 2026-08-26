/*
  Warnings:

  - You are about to drop the column `adress` on the `stores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stores" DROP COLUMN "adress",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "location" TEXT;
