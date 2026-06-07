-- CreateEnum
CREATE TYPE "VehicleHighlightTier" AS ENUM ('NORMAL', 'BRONZE', 'PRATA', 'OURO');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "highlightTier" "VehicleHighlightTier" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Vehicle" ADD COLUMN "highlightExpiresAt" TIMESTAMP(3);
