/**
 * Cria uma campanha house ad de exemplo (fase 1).
 * Uso: cd backend && node scripts/seed-ad-campaign.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.adCampaign.findFirst({
    where: { title: "União LocaCar — Parceiros" },
  });
  if (existing) {
    console.log("Campanha de exemplo já existe:", existing.id);
    return;
  }

  const campaign = await prisma.adCampaign.create({
    data: {
      status: "ACTIVE",
      title: "Parceiros União LocaCar",
      subtitle: "Seguros, oficinas e benefícios para quem aluga na plataforma.",
      imageUrl: null,
      ctaLabel: "Conhecer parceiros",
      /*clickUrl: "https://github.com/claudirc1967/projeto-uniao-locacar",*/  
      clickUrl: "https://uniaolocacar.com.br/parceiros",
      placements: ["DRIVER_HOME", "MARKETPLACE_LIST"],
      targetRoles: ["DRIVER"],
      targetUfs: [],
      targetCidades: [],
      nationwide: true,
      priority: 10,
      startsAt: new Date(),
      endsAt: null,
    },
  });

  console.log("Campanha criada:", campaign.id, campaign.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
