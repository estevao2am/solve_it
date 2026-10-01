-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "proposals_jobId_idx" ON "proposals"("jobId");

-- CreateIndex
CREATE INDEX "proposals_professionalId_idx" ON "proposals"("professionalId");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");
