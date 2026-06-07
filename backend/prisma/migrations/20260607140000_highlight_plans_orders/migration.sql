-- CreateEnum
CREATE TYPE "VehicleHighlightOrderStatus" AS ENUM ('DRAFT', 'PENDING_PIX', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM');

-- CreateTable
CREATE TABLE "HighlightPlan" (
    "id" TEXT NOT NULL,
    "tier" "VehicleHighlightTier" NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HighlightPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HighlightPlatformConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pixKey" TEXT NOT NULL DEFAULT '',
    "pixKeyType" "PixKeyType" NOT NULL DEFAULT 'RANDOM',
    "receiverName" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HighlightPlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleHighlightOrder" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "tier" "VehicleHighlightTier" NOT NULL,
    "status" "VehicleHighlightOrderStatus" NOT NULL DEFAULT 'PENDING_PIX',
    "amountCents" INTEGER NOT NULL,
    "durationDaysSnapshot" INTEGER NOT NULL,
    "orderReference" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleHighlightOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HighlightPlan_tier_key" ON "HighlightPlan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleHighlightOrder_orderReference_key" ON "VehicleHighlightOrder"("orderReference");

-- CreateIndex
CREATE INDEX "VehicleHighlightOrder_status_idx" ON "VehicleHighlightOrder"("status");

-- CreateIndex
CREATE INDEX "VehicleHighlightOrder_ownerUserId_idx" ON "VehicleHighlightOrder"("ownerUserId");

-- CreateIndex
CREATE INDEX "VehicleHighlightOrder_vehicleId_idx" ON "VehicleHighlightOrder"("vehicleId");

-- AddForeignKey
ALTER TABLE "VehicleHighlightOrder" ADD CONSTRAINT "VehicleHighlightOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleHighlightOrder" ADD CONSTRAINT "VehicleHighlightOrder_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleHighlightOrder" ADD CONSTRAINT "VehicleHighlightOrder_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed plan rows (inactive until admin configures)
INSERT INTO "HighlightPlan" ("id", "tier", "priceCents", "durationDays", "active", "updatedAt")
VALUES
  ('plan_bronze', 'BRONZE', 0, 30, false, CURRENT_TIMESTAMP),
  ('plan_prata', 'PRATA', 0, 30, false, CURRENT_TIMESTAMP),
  ('plan_ouro', 'OURO', 0, 30, false, CURRENT_TIMESTAMP)
ON CONFLICT ("tier") DO NOTHING;

INSERT INTO "HighlightPlatformConfig" ("id", "pixKey", "pixKeyType", "receiverName", "updatedAt")
VALUES ('default', '', 'RANDOM', '', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
