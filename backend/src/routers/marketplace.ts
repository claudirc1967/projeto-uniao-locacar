import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { AuthedContext } from "../context.js";
import { isDriverBlockedFromVehicleRequest } from "../driverVehicleBlock.js";
import { prisma } from "../db.js";
import { loadVehicleExposureCounts } from "../highlights/exposure.js";
import {
  effectiveHighlightTier,
  sortVehiclesForMarketplace,
} from "../highlights/tier.js";
import { presignGetRead } from "../storage/s3.js";
import { protectedProcedure, router } from "../trpc.js";
import { findVehicleIdsByFoldedContains } from "../utils/textSearch.js";
import { vehicleTypeSchema } from "../vehicleCapacity.js";

const listFiltersSchema = z.object({
  brandContains: z.string().max(120).optional(),
  modelContains: z.string().max(120).optional(),
  corContains: z.string().max(120).optional(),
  pickupUf: z.string().length(2).optional(),
  pickupCityContains: z.string().max(120).optional(),
  ownerUserId: z.string().min(1).optional(),
  ownerNameContains: z.string().max(200).optional(),
  yearMin: z.number().int().min(1900).max(2100).optional(),
  yearMax: z.number().int().min(1900).max(2100).optional(),
  vehicleType: vehicleTypeSchema.optional(),
  portas: z.number().int().min(2).max(8).optional(),
  lugares: z.number().int().min(1).max(15).optional(),
  contractTime: z.enum(["DIARIO", "SEMANAL", "MENSAL"]).optional(),
  priceMinCents: z.number().int().min(0).optional(),
  priceMaxCents: z.number().int().min(0).optional(),
  /** Média mínima do locador (avaliações recebidas de locatários). Exige ao menos 1 avaliação. */
  ownerMinAverageStars: z.number().int().min(1).max(5).optional(),
  /** Desloca rodízio dentro do mesmo tier de destaque (fase 4). */
  rotationSeed: z.number().int().min(0).max(9999).optional(),
});

function tagsFromJson(json: unknown): string[] {
  if (json == null) return [];
  if (Array.isArray(json)) {
    return json.filter((x): x is string => typeof x === "string");
  }
  return [];
}

async function safePresignGetRead(key: string): Promise<string | null> {
  try {
    return await presignGetRead(key, 3600);
  } catch {
    return null;
  }
}

function buildVehicleWhere(
  f: z.infer<typeof listFiltersSchema>,
  textMatchIds?: string[]
): Prisma.VehicleWhereInput {
  const and: Prisma.VehicleWhereInput[] = [{ available: true }];

  // Marca/modelo/cor/cidade/nome do locador: case + acento via findVehicleIdsByFoldedContains
  if (textMatchIds) {
    and.push({ id: { in: textMatchIds } });
  }

  const uf = f.pickupUf?.trim().toUpperCase();
  if (uf) {
    and.push({ pickupUf: uf });
  }

  const ownerUserId = f.ownerUserId?.trim();
  if (ownerUserId) {
    and.push({ ownerUserId });
  }

  if (f.ownerMinAverageStars != null) {
    and.push({
      owner: {
        ownerProfile: {
          is: {
            ratingCount: { gt: 0 },
            averageRating: { gte: f.ownerMinAverageStars },
          },
        },
      },
    });
  }

  if (f.yearMin != null) {
    and.push({ year: { gte: f.yearMin } });
  }
  if (f.yearMax != null) {
    and.push({ year: { lte: f.yearMax } });
  }
  if (f.vehicleType != null) {
    and.push({ vehicleType: f.vehicleType });
  }
  if (f.portas != null) {
    and.push({ vehicleType: "CAR", portas: f.portas });
  }
  if (f.lugares != null) {
    and.push({ vehicleType: "CAR", lugares: f.lugares });
  }
  if (f.contractTime != null) {
    and.push({ contractTime: f.contractTime });
  }
  if (f.priceMinCents != null) {
    and.push({ dailyRateCents: { gte: f.priceMinCents } });
  }
  if (f.priceMaxCents != null) {
    and.push({ dailyRateCents: { lte: f.priceMaxCents } });
  }

  return { AND: and };
}

export const marketplaceRouter = router({
  listVehicleBrands: protectedProcedure.query(async () => {
    const rows = await prisma.vehicleBrand.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
    return rows;
  }),

  listVehicleModels: protectedProcedure
    .input(
      z.object({
        brandName: z.string().min(1).max(120),
        vehicleType: vehicleTypeSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      const brand = await prisma.vehicleBrand.findFirst({
        where: { name: input.brandName.trim(), active: true },
        select: { id: true },
      });
      if (!brand) return [];
      return prisma.vehicleModel.findMany({
        where: {
          brandId: brand.id,
          active: true,
          ...(input.vehicleType ? { vehicleType: input.vehicleType } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, vehicleType: true },
      });
    }),

  listAvailableVehicles: protectedProcedure
    .input(listFiltersSchema)
    .query(async ({ ctx, input }) => {
      const f = input;
      if (
        f.yearMin != null &&
        f.yearMax != null &&
        f.yearMin > f.yearMax
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ano mínimo não pode ser maior que o ano máximo.",
        });
      }
      if (
        f.priceMinCents != null &&
        f.priceMaxCents != null &&
        f.priceMinCents > f.priceMaxCents
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Valor mínimo não pode ser maior que o valor máximo.",
        });
      }

      const textMatchIds = await findVehicleIdsByFoldedContains(f);
      const where = buildVehicleWhere(f, textMatchIds);
      const rawList = await prisma.vehicle.findMany({
        where,
        include: {
          photos: { orderBy: { sortOrder: "asc" }, take: 1 },
          owner: {
            select: {
              id: true,
              email: true,
              ownerProfile: {
                select: {
                  nomeRazaoSocial: true,
                  phone: true,
                  cidade: true,
                  uf: true,
                  averageRating: true,
                  ratingCount: true,
                },
              },
            },
          },
        },
      });
      const vehicleIds = rawList.map((v) => v.id);
      const exposureCounts = await loadVehicleExposureCounts(vehicleIds);
      const list = sortVehiclesForMarketplace(rawList, {
        exposureCounts,
        rotationSeed: f.rotationSeed ?? 0,
      });
      try {
        return await Promise.all(
          list.map(async (v) => {
            const thumb = v.photos[0];
            const coverUrl = thumb
              ? await safePresignGetRead(thumb.key)
              : null;
            const u = ctx as AuthedContext;
            let driverRequestBlocked: boolean | undefined;
            if (u.user.role === "DRIVER") {
              driverRequestBlocked = await isDriverBlockedFromVehicleRequest(
                v.id,
                u.user.id
              );
            }
            return {
              id: v.id,
              title: v.title,
              description: v.description,
              plate: v.plate,
              brand: v.brand,
              model: v.model,
              year: v.year,
              cor: v.cor,
              vehicleType: v.vehicleType,
              portas: v.portas,
              lugares: v.lugares,
              contractTime: v.contractTime,
              dailyRateCents: v.dailyRateCents,
              pickupCity: v.pickupCity,
              pickupUf: v.pickupUf,
              ownerUserId: v.owner.id,
              ownerName: v.owner.ownerProfile?.nomeRazaoSocial || null,
              ownerPhone: v.owner.ownerProfile?.phone || null,
              ownerCity: v.owner.ownerProfile?.cidade || null,
              ownerUf: v.owner.ownerProfile?.uf || null,
              ownerAverageRating: v.owner.ownerProfile?.averageRating ?? null,
              ownerRatingCount: v.owner.ownerProfile?.ratingCount ?? 0,
              coverPhotoUrl: coverUrl,
              driverRequestBlocked,
              effectiveHighlightTier: effectiveHighlightTier(v),
            };
          })
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro no storage";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: msg,
        });
      }
    }),

  trackListImpression: protectedProcedure
    .input(
      z.object({
        eventId: z.string().min(8).max(64),
        vehicleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx as AuthedContext).user.id;

      const existing = await prisma.marketplaceExposureEvent.findUnique({
        where: { eventId: input.eventId },
      });
      if (existing) {
        return { ok: true as const, duplicate: true as const };
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: input.vehicleId, available: true },
        select: { id: true },
      });
      if (!vehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não encontrado",
        });
      }

      await prisma.marketplaceExposureEvent.create({
        data: {
          eventId: input.eventId,
          vehicleId: input.vehicleId,
          viewerUserId: userId,
          placement: "LIST",
        },
      });

      return { ok: true as const, duplicate: false as const };
    }),

  getVehiclePublic: protectedProcedure
    .input(z.object({ vehicleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const v = await prisma.vehicle.findFirst({
        where: { id: input.vehicleId, available: true },
        include: {
          photos: { orderBy: { sortOrder: "asc" } },
          owner: {
            select: {
              id: true,
              email: true,
              ownerProfile: {
                select: {
                  nomeRazaoSocial: true,
                  averageRating: true,
                  ratingCount: true,
                },
              },
            },
          },
        },
      });
      if (!v) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não disponível",
        });
      }
      try {
        const photosWithMaybeUrls = await Promise.all(
          v.photos.map(async (p) => ({
            id: p.id,
            key: p.key,
            contentType: p.contentType,
            sortOrder: p.sortOrder,
            photoUrl: await safePresignGetRead(p.key),
          }))
        );
        const photos = photosWithMaybeUrls.filter(
          (p): p is typeof p & { photoUrl: string } => Boolean(p.photoUrl)
        );
        const u = ctx as AuthedContext;
        let driverRequestBlocked: boolean | undefined;
        if (u.user.role === "DRIVER") {
          driverRequestBlocked = await isDriverBlockedFromVehicleRequest(
            v.id,
            u.user.id
          );
        }
        return {
          id: v.id,
          title: v.title,
          description: v.description,
          plate: v.plate,
          brand: v.brand,
          model: v.model,
          year: v.year,
          cor: v.cor,
          vehicleType: v.vehicleType,
          portas: v.portas,
          lugares: v.lugares,
          contractTime: v.contractTime,
          dailyRateCents: v.dailyRateCents,
          requirementsJson: v.requirementsJson,
          paymentNotes: v.paymentNotes,
          caucao: v.caucao,
          pickupCep: v.pickupCep,
          pickupLogradouro: v.pickupLogradouro,
          pickupNumero: v.pickupNumero,
          pickupComplemento: v.pickupComplemento,
          pickupBairro: v.pickupBairro,
          pickupCity: v.pickupCity,
          pickupUf: v.pickupUf,
          ownerUserId: v.owner.id,
          ownerName: v.owner.ownerProfile?.nomeRazaoSocial || null,
          ownerEmail: v.owner.email,
          ownerAverageRating: v.owner.ownerProfile?.averageRating ?? null,
          ownerRatingCount: v.owner.ownerProfile?.ratingCount ?? 0,
          photos,
          driverRequestBlocked,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro no storage";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: msg,
        });
      }
    }),

  listOwnerReviews: protectedProcedure
    .input(z.object({ ownerUserId: z.string().min(1) }))
    .query(async ({ input }) => {
      const profile = await prisma.ownerProfile.findUnique({
        where: { userId: input.ownerUserId },
        select: {
          nomeRazaoSocial: true,
          averageRating: true,
          ratingCount: true,
        },
      });
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Locador não encontrado.",
        });
      }

      const reviews = await prisma.rentalReview.findMany({
        where: {
          toUserId: input.ownerUserId,
          direction: "DRIVER_TO_OWNER",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          rental: {
            select: {
              id: true,
              vehicle: { select: { title: true } },
            },
          },
        },
      });

      return {
        summary: {
          displayName: profile.nomeRazaoSocial || null,
          averageRating: profile.ratingCount > 0 ? profile.averageRating : null,
          ratingCount: profile.ratingCount,
        },
        items: reviews.map((review) => ({
          id: review.id,
          rentalId: review.rentalId,
          vehicleTitle: review.rental.vehicle.title,
          stars: review.stars,
          tags: tagsFromJson(review.tagsJson),
          comment: review.comment,
          createdAt: review.createdAt,
        })),
      };
    }),
});
