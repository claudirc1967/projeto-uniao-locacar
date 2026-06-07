-- CreateEnum
CREATE TYPE "MarketplaceExposurePlacement" AS ENUM ('LIST');

-- CreateTable
CREATE TABLE "MarketplaceExposureEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "viewerUserId" TEXT,
    "placement" "MarketplaceExposurePlacement" NOT NULL DEFAULT 'LIST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceExposureEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceExposureEvent_eventId_key" ON "MarketplaceExposureEvent"("eventId");

-- CreateIndex
CREATE INDEX "MarketplaceExposureEvent_vehicleId_createdAt_idx" ON "MarketplaceExposureEvent"("vehicleId", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketplaceExposureEvent" ADD CONSTRAINT "MarketplaceExposureEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceExposureEvent" ADD CONSTRAINT "MarketplaceExposureEvent_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
