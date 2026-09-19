/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProfessionalProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Proposal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProfessionalType" AS ENUM ('INDEPENDENT', 'COMPANY', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NIF_PROOF', 'NISS_PROOF', 'PAYMENT_PROOF');

-- CreateEnum
CREATE TYPE "ProfessionalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_clientId_fkey";

-- DropForeignKey
ALTER TABLE "JobImage" DROP CONSTRAINT "JobImage_jobId_fkey";

-- DropForeignKey
ALTER TABLE "ProfessionalProfile" DROP CONSTRAINT "ProfessionalProfile_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "ProfessionalProfile" DROP CONSTRAINT "ProfessionalProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_targetId_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Job";

-- DropTable
DROP TABLE "JobImage";

-- DropTable
DROP TABLE "ProfessionalProfile";

-- DropTable
DROP TABLE "Proposal";

-- DropTable
DROP TABLE "Review";

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "bio" TEXT,
    "experienceYears" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "status" "ProfessionalStatus" NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "fiscalType" "ProfessionalType" NOT NULL,
    "nif" TEXT NOT NULL,
    "niss" TEXT,
    "accountHolder" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_documents" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "locationVerified" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "clientId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "jobId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "coverLetter" TEXT,
    "jobId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_userId_key" ON "professional_profiles"("userId");

-- CreateIndex
CREATE INDEX "professional_profiles_categoryId_idx" ON "professional_profiles"("categoryId");

-- CreateIndex
CREATE INDEX "professional_profiles_status_idx" ON "professional_profiles"("status");

-- CreateIndex
CREATE INDEX "professional_profiles_nif_idx" ON "professional_profiles"("nif");

-- CreateIndex
CREATE INDEX "professional_documents_professionalProfileId_idx" ON "professional_documents"("professionalProfileId");

-- CreateIndex
CREATE INDEX "professional_documents_type_idx" ON "professional_documents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "professional_documents_professionalProfileId_type_key" ON "professional_documents"("professionalProfileId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_documents" ADD CONSTRAINT "professional_documents_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_images" ADD CONSTRAINT "job_images_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
