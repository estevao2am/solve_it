/*
  Warnings:

  - Added the required column `fileHash` to the `professional_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "professional_documents" ADD COLUMN     "fileHash" TEXT NOT NULL;
