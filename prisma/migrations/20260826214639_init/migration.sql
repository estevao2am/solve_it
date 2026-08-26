/*
  Warnings:

  - You are about to drop the column `location` on the `stores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stores" DROP COLUMN "location",
ADD COLUMN     "address" TEXT;
