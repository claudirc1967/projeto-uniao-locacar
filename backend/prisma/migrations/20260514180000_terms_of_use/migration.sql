-- AlterTable
ALTER TABLE "User" ADD COLUMN "termsOfUseVersion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "termsOfUseAcceptedAt" TIMESTAMP(3);
