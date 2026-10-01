/*
  Warnings:

  - A unique constraint covering the columns `[jobId,professionalId]` on the table `proposals` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "proposals_jobId_professionalId_key" ON "proposals"("jobId", "professionalId");
