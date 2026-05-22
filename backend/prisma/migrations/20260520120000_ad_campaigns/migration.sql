-- CreateEnum
CREATE TYPE "AdPlacementKey" AS ENUM ('DRIVER_HOME', 'MARKETPLACE_LIST');

-- CreateEnum
CREATE TYPE "AdCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "AdEventType" AS ENUM ('IMPRESSION', 'CLICK', 'DISMISS', 'FILL_ERROR');

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Saiba mais',
    "clickUrl" TEXT NOT NULL,
    "placements" "AdPlacementKey"[],
    "targetRoles" "Role"[],
    "targetUfs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetCidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nationwide" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sourcePartnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "campaignId" TEXT,
    "userId" TEXT,
    "placement" "AdPlacementKey" NOT NULL,
    "eventType" "AdEventType" NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdCampaign_status_priority_idx" ON "AdCampaign"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "AdEvent_eventId_key" ON "AdEvent"("eventId");

-- CreateIndex
CREATE INDEX "AdEvent_campaignId_eventType_idx" ON "AdEvent"("campaignId", "eventType");

-- CreateIndex
CREATE INDEX "AdEvent_userId_createdAt_idx" ON "AdEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
