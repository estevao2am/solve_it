-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'MBWAY', 'MULTIBANCO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'AWAITING_PAYMENT';
ALTER TYPE "JobStatus" ADD VALUE 'PAID';
ALTER TYPE "JobStatus" ADD VALUE 'AWAITING_CONFIRMATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PROPOSAL_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'PROPOSAL_NOT_SELECTED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_STATUS_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'WALLET_CREDITED';

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "professionalAmount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "phone" TEXT,
    "mbEntity" TEXT,
    "mbReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_jobId_key" ON "payments"("jobId");

-- CreateIndex
CREATE INDEX "payments_clientId_idx" ON "payments"("clientId");

-- CreateIndex
CREATE INDEX "payments_professionalId_status_idx" ON "payments"("professionalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_paymentId_key" ON "wallet_transactions"("paymentId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
