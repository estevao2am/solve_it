-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('BANK_TRANSFER', 'MBWAY', 'CARD');

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "payoutDestination" TEXT,
ADD COLUMN     "payoutMethod" "PayoutMethod";
