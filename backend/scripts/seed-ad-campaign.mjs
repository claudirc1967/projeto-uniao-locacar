/**
 * Cria ou atualiza campanhas house ad de exemplo (fases 1 e 4 lite).
 * Uso: cd backend && node scripts/seed-ad-campaign.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CAMPAIGNS = [
  {
    title: "Parceiros União LocaCar",
    subtitle: "Seguros, oficinas e benefícios para quem aluga na plataforma.",
    clickUrl: "https://uniaolocacar.com.br/parceiros",
    ctaLabel: "Conhecer parceiros",
    priority: 10,
  },
  {
    title: "Locação com segurança",
    subtitle: "Encontre veículos verificados e locadores avaliados na sua região.",
    clickUrl: "https://uniaolocacar.com.br/sobre",
    ctaLabel: "Saiba mais",
    priority: 10,
  },
];

const shared = {
  status: "ACTIVE",
  imageUrl: null,
  placements: ["DRIVER_HOME", "MARKETPLACE_LIST"],
  targetRoles: ["DRIVER"],
  targetUfs: [],
  targetCidades: [],
  nationwide: true,
  startsAt: new Date(),
  endsAt: null,
};

async function upsertCampaign(data) {
  const existing = await prisma.adCampaign.findFirst({
    where: { title: data.title },
  });

  if (existing) {
    const updated = await prisma.adCampaign.update({
      where: { id: existing.id },
      data: { ...shared, ...data },
    });
    console.log("Campanha atualizada:", updated.id, updated.title);
    return updated;
  }

  const campaign = await prisma.adCampaign.create({
    data: { ...shared, ...data },
  });
  console.log("Campanha criada:", campaign.id, campaign.title);
  return campaign;
}

async function main() {
  for (const item of CAMPAIGNS) {
    await upsertCampaign(item);
  }

  const legacy = await prisma.adCampaign.findFirst({
    where: {
      clickUrl: { contains: "github.com/claudirc1967/projeto-uniao-locacar" },
      title: { notIn: CAMPAIGNS.map((c) => c.title) },
    },
  });
  if (legacy) {
    await prisma.adCampaign.update({
      where: { id: legacy.id },
      data: { status: "PAUSED" },
    });
    console.log("Campanha legada pausada:", legacy.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
