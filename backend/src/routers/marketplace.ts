import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { AuthedContext } from "../context.js";
import { isDriverBlockedFromVehicleRequest } from "../driverVehicleBlock.js";
import { prisma } from "../db.js";
import { presignGetRead } from "../storage/s3.js";
import { protectedProcedure, router } from "../trpc.js";

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
  portas: z.number().int().min(2).max(8).optional(),
  lugares: z.number().int().min(1).max(15).optional(),
  contractTime: z.enum(["DIARIO", "SEMANAL", "MENSAL"]).optional(),
  priceMinCents: z.number().int().min(0).optional(),
  priceMaxCents: z.number().int().min(0).optional(),
});

function buildVehicleWhere(
  f: z.infer<typeof listFiltersSchema>
): Prisma.VehicleWhereInput {
  const and: Prisma.VehicleWhereInput[] = [{ available: true }];

  const brand = f.brandContains?.trim();
  if (brand) {
    and.push({ brand: { contains: brand } });
  }
  const model = f.modelContains?.trim();
  if (model) {
    and.push({ model: { contains: model } });
  }
  const cor = f.corContains?.trim();
  if (cor) {
    and.push({ cor: { contains: cor } });
  }

  const uf = f.pickupUf?.trim().toUpperCase();
  if (uf) {
    and.push({ pickupUf: uf });
  }
  const city = f.pickupCityContains?.trim();
  if (city) {
    and.push({ pickupCity: { contains: city } });
  }

  const ownerUserId = f.ownerUserId?.trim();
  if (ownerUserId) {
    and.push({ ownerUserId });
  }
  const ownerName = f.ownerNameContains?.trim();
  if (ownerName) {
    and.push({
      owner: {
        ownerProfile: {
          is: { nomeRazaoSocial: { contains: ownerName } },
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
  if (f.portas != null) {
    and.push({ portas: f.portas });
  }
  if (f.lugares != null) {
    and.push({ lugares: f.lugares });
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

      const where = buildVehicleWhere(f);
      const list = await prisma.vehicle.findMany({
        where,
        orderBy: { updatedAt: "desc" },
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
                },
              },
            },
          },
        },
      });
      try {
        return await Promise.all(
          list.map(async (v) => {
            const thumb = v.photos[0];
            const coverUrl = thumb
              ? await presignGetRead(thumb.key, 3600)
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
              coverPhotoUrl: coverUrl,
              driverRequestBlocked,
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
                select: { nomeRazaoSocial: true },
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
        const photos = await Promise.all(
          v.photos.map(async (p) => ({
            id: p.id,
            key: p.key,
            contentType: p.contentType,
            sortOrder: p.sortOrder,
            photoUrl: await presignGetRead(p.key, 3600),
          }))
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
});
