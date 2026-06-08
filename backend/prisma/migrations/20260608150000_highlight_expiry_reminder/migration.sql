-- AlterTable
ALTER TABLE "VehicleHighlightOrder" ADD COLUMN "expiryReminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "VehicleHighlightOrder_status_endsAt_idx" ON "VehicleHighlightOrder"("status", "endsAt");
