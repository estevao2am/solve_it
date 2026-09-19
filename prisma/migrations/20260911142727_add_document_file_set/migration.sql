/*
  Warnings:

  - A unique constraint covering the columns `[professionalProfileId,fileHash]` on the table `professional_documents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "professional_documents_fileHash_idx" ON "professional_documents"("fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "professional_documents_professionalProfileId_fileHash_key" ON "professional_documents"("professionalProfileId", "fileHash");
