import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthedContext } from "../context.js";
import { pickEligibleCampaign } from "../ads/eligibility.js";
import { loadUserImpressionCounts } from "../ads/impressionCounts.js";
import { prisma } from "../db.js";
import { protectedProcedure, router } from "../trpc.js";
import { adsAdminRouter } from "./adsAdmin.js";

const placementSchema = z.enum(["DRIVER_HOME", "MARKETPLACE_LIST"]);
const platformSchema = z.enum(["ios", "android", "web"]);
const eventTypeSchema = z.enum([
  "IMPRESSION",
  "CLICK",
  "DISMISS",
  "FILL_ERROR",
]);

function geoFromUser(user: AuthedContext["user"]) {
  if (user.role === "DRIVER" && user.driverProfile) {
    return {
      uf: user.driverProfile.uf,
      cidade: user.driverProfile.cidade,
    };
  }
  if (user.role === "OWNER" && user.ownerProfile) {
    return {
      uf: user.ownerProfile.uf,
      cidade: user.ownerProfile.cidade,
    };
  }
  return { uf: null as string | null, cidade: null as string | null };
}

export const adsRouter = router({
  decision: protectedProcedure
    .input(
      z.object({
        placement: placementSchema,
        platform: platformSchema.optional(),
        uf: z.string().max(2).optional(),
        cidade: z.string().max(120).optional(),
        /** Índice do slot (ex.: marketplace) para rodízio entre campanhas do mesmo tier. */
        rotationSeed: z.number().int().min(0).max(9999).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = (ctx as AuthedContext).user;
      const profileGeo = geoFromUser(user);
      const uf = input.uf?.trim() || profileGeo.uf;
      const cidade = input.cidade?.trim() || profileGeo.cidade;

      const [campaigns, impressionCounts] = await Promise.all([
        prisma.adCampaign.findMany({
          where: { status: "ACTIVE" },
        }),
        loadUserImpressionCounts(user.id),
      ]);

      const picked = pickEligibleCampaign(campaigns, {
        placement: input.placement,
        role: user.role,
        uf,
        cidade,
        userId: user.id,
        rotationSeed: input.rotationSeed,
        impressionCounts,
      });

      if (!picked) {
        return {
          kind: "none" as const,
          admobEnabled: false,
        };
      }

      return {
        kind: "house" as const,
        admobEnabled: false,
        house: {
          campaignId: picked.id,
          title: picked.title,
          subtitle: picked.subtitle,
          imageUrl: picked.imageUrl,
          ctaLabel: picked.ctaLabel,
          clickUrl: picked.clickUrl,
        },
      };
    }),

  track: protectedProcedure
    .input(
      z.object({
        eventId: z.string().min(8).max(64),
        placement: placementSchema,
        eventType: eventTypeSchema,
        campaignId: z.string().optional(),
        platform: platformSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx as AuthedContext).user.id;

      const existing = await prisma.adEvent.findUnique({
        where: { eventId: input.eventId },
      });
      if (existing) {
        return { ok: true as const, duplicate: true as const };
      }

      if (input.campaignId) {
        const campaign = await prisma.adCampaign.findUnique({
          where: { id: input.campaignId },
        });
        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campanha não encontrada",
          });
        }
      }

      await prisma.adEvent.create({
        data: {
          eventId: input.eventId,
          campaignId: input.campaignId ?? null,
          userId,
          placement: input.placement,
          eventType: input.eventType,
          platform: input.platform ?? null,
        },
      });

      return { ok: true as const, duplicate: false as const };
    }),

  admin: adsAdminRouter,
});
