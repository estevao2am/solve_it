-- AlterTable
ALTER TABLE "professional_profiles" ADD COLUMN     "payoutCardLast4" TEXT,
ADD COLUMN     "payoutMethod" "PayoutMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
ADD COLUMN     "payoutPhone" TEXT;
