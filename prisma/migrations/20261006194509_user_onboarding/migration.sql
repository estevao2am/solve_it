-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarded_at" TIMESTAMP(3);

-- As contas que já existiam não passam pelo onboarding
UPDATE "users" SET "onboarded_at" = "created_at" WHERE "onboarded_at" IS NULL;
