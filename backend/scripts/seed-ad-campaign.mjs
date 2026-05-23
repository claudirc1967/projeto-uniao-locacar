/**
 * Cria ou atualiza a campanha house ad de exemplo (fase 1).
 * Uso: cd backend && node scripts/seed-ad-campaign.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CAMPAIGN_TITLE = "Parceiros União LocaCar";

const campaignData = {
  status: "ACTIVE",
  title: CAMPAIGN_TITLE,
  subtitle: "Seguros, oficinas e benefícios para quem aluga na plataforma.",
  imageUrl: null,
  ctaLabel: "Conhecer parceiros",
  clickUrl: "https://uniaolocacar.com.br/parceiros",
  placements: ["DRIVER_HOME", "MARKETPLACE_LIST"],
  targetRoles: ["DRIVER"],
  targetUfs: [],
  targetCidades: [],
  nationwide: true,
  priority: 10,
  startsAt: new Date(),
  endsAt: null,
};

async function main() {
  const existing = await prisma.adCampaign.findFirst({
    where: { title: CAMPAIGN_TITLE },
  });

  if (existing) {
    const updated = await prisma.adCampaign.update({
      where: { id: existing.id },
      data: {
        clickUrl: campaignData.clickUrl,
        ctaLabel: campaignData.ctaLabel,
        subtitle: campaignData.subtitle,
        status: campaignData.status,
        placements: campaignData.placements,
        nationwide: campaignData.nationwide,
        priority: campaignData.priority,
      },
    });
    console.log("Campanha atualizada:", updated.id, updated.clickUrl);
    return;
  }

  const legacy = await prisma.adCampaign.findFirst({
    where: {
      clickUrl: { contains: "github.com/claudirc1967/projeto-uniao-locacar" },
    },
  });
  if (legacy) {
    const updated = await prisma.adCampaign.update({
      where: { id: legacy.id },
      data: campaignData,
    });
    console.log("Campanha legada atualizada:", updated.id, updated.clickUrl);
    return;
  }

  const campaign = await prisma.adCampaign.create({ data: campaignData });
  console.log("Campanha criada:", campaign.id, campaign.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
