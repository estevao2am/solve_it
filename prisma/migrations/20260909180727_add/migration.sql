/*
  Warnings:

  - You are about to drop the `_CategoryToProfessionalProfile` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `ProfessionalProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PROFESSIONAL';

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_targetId_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToProfessionalProfile" DROP CONSTRAINT "_CategoryToProfessionalProfile_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToProfessionalProfile" DROP CONSTRAINT "_CategoryToProfessionalProfile_B_fkey";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "categoryId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_CategoryToProfessionalProfile";

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
