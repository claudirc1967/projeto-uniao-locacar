import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { adminProcedure, router } from "../trpc.js";

const placementSchema = z.enum(["DRIVER_HOME", "MARKETPLACE_LIST"]);
const statusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED"]);
const targetRoleSchema = z.enum(["OWNER", "DRIVER"]);

const campaignBodySchema = z.object({
  status: statusSchema,
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(240).nullable().optional(),
  imageUrl: z
    .string()
    .trim()
    .max(2048)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  ctaLabel: z.string().trim().min(1).max(60).default("Saiba mais"),
  clickUrl: z.string().trim().url().max(2048),
  placements: z.array(placementSchema).min(1),
  targetRoles: z.array(targetRoleSchema).default([]),
  targetUfs: z
    .array(z.string().trim().length(2).transform((s) => s.toUpperCase()))
    .default([]),
  targetCidades: z
    .array(z.string().trim().min(1).max(120).transform((s) => s.toLowerCase()))
    .default([]),
  nationwide: z.boolean().default(false),
  priority: z.number().int().min(-1000).max(1000).default(0),
  startsAt: z.date().nullable().optional(),
  endsAt: z.date().nullable().optional(),
  sourcePartnerId: z.string().trim().min(1).nullable().optional(),
});

function serializeCampaign(campaign: {
  id: string;
  status: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  clickUrl: string;
  placements: string[];
  targetRoles: string[];
  targetUfs: string[];
  targetCidades: string[];
  nationwide: boolean;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  sourcePartnerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: campaign.id,
    status: campaign.status,
    title: campaign.title,
    subtitle: campaign.subtitle,
    imageUrl: campaign.imageUrl,
    ctaLabel: campaign.ctaLabel,
    clickUrl: campaign.clickUrl,
    placements: campaign.placements,
    targetRoles: campaign.targetRoles,
    targetUfs: campaign.targetUfs,
    targetCidades: campaign.targetCidades,
    nationwide: campaign.nationwide,
    priority: campaign.priority,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    sourcePartnerId: campaign.sourcePartnerId,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

async function statsForCampaignIds(ids: string[]) {
  const statsMap = new Map<string, { impressions: number; clicks: number }>();
  if (ids.length === 0) return statsMap;

  const grouped = await prisma.adEvent.groupBy({
    by: ["campaignId", "eventType"],
    where: { campaignId: { in: ids } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    if (!row.campaignId) continue;
    const cur = statsMap.get(row.campaignId) ?? { impressions: 0, clicks: 0 };
    if (row.eventType === "IMPRESSION") cur.impressions = row._count._all;
    if (row.eventType === "CLICK") cur.clicks = row._count._all;
    statsMap.set(row.campaignId, cur);
  }

  return statsMap;
}

export const adsAdminRouter = router({
  list: adminProcedure.query(async () => {
    const campaigns = await prisma.adCampaign.findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });
    const statsMap = await statsForCampaignIds(campaigns.map((c) => c.id));

    return campaigns.map((c) => ({
      ...serializeCampaign(c),
      stats: statsMap.get(c.id) ?? { impressions: 0, clicks: 0 },
    }));
  }),

  get: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const campaign = await prisma.adCampaign.findUnique({
        where: { id: input.id },
      });
      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campanha não encontrada",
        });
      }
      const statsMap = await statsForCampaignIds([campaign.id]);
      return {
        ...serializeCampaign(campaign),
        stats: statsMap.get(campaign.id) ?? { impressions: 0, clicks: 0 },
      };
    }),

  create: adminProcedure.input(campaignBodySchema).mutation(async ({ input }) => {
    const campaign = await prisma.adCampaign.create({
      data: {
        status: input.status,
        title: input.title,
        subtitle: input.subtitle ?? null,
        imageUrl: input.imageUrl ?? null,
        ctaLabel: input.ctaLabel,
        clickUrl: input.clickUrl,
        placements: input.placements,
        targetRoles: input.targetRoles,
        targetUfs: input.targetUfs,
        targetCidades: input.targetCidades,
        nationwide: input.nationwide,
        priority: input.priority,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        sourcePartnerId: input.sourcePartnerId ?? null,
      },
    });
    return serializeCampaign(campaign);
  }),

  update: adminProcedure
    .input(z.object({ id: z.string().min(1) }).merge(campaignBodySchema))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const existing = await prisma.adCampaign.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campanha não encontrada",
        });
      }

      const campaign = await prisma.adCampaign.update({
        where: { id },
        data: {
          status: data.status,
          title: data.title,
          subtitle: data.subtitle ?? null,
          imageUrl: data.imageUrl ?? null,
          ctaLabel: data.ctaLabel,
          clickUrl: data.clickUrl,
          placements: data.placements,
          targetRoles: data.targetRoles,
          targetUfs: data.targetUfs,
          targetCidades: data.targetCidades,
          nationwide: data.nationwide,
          priority: data.priority,
          startsAt: data.startsAt ?? null,
          endsAt: data.endsAt ?? null,
          sourcePartnerId: data.sourcePartnerId ?? null,
        },
      });
      return serializeCampaign(campaign);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const existing = await prisma.adCampaign.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campanha não encontrada",
        });
      }
      await prisma.adCampaign.delete({ where: { id: input.id } });
      return { ok: true as const };
    }),
});
