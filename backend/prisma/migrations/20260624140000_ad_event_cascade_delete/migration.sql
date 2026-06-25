-- Excluir campanha remove impressões/cliques vinculados (AdEvent).
ALTER TABLE "AdEvent" DROP CONSTRAINT "AdEvent_campaignId_fkey";

ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
