import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ownerProfileIssues } from "../admin/ownerProfileIssues.js";
import { prisma } from "../db.js";
import { effectiveHighlightTier } from "../highlights/tier.js";
import { presignGetRead } from "../storage/s3.js";
import { adminProcedure, router } from "../trpc.js";

async function photoUrlForKey(key: string | undefined) {
  if (!key) return null;
  try {
    return await presignGetRead(key, 3600);
  } catch {
    return null;
  }
}

function serializeOwnerListItem(
  user: {
    id: string;
    email: string;
    createdAt: Date;
    ownerProfile: {
      nomeRazaoSocial: string;
      emailLocador: string;
      cpfCnpj: string;
      phone: string;
      cidade: string;
      uf: string;
      contractTemplateText: string | null;
      cep: string;
      logradouro: string;
      bairro: string;
      numero: string;
      complemento: string;
    } | null;
    _count: { vehicles: number };
  }
) {
  const profile = user.ownerProfile;
  const issues = ownerProfileIssues(profile);
  return {
    ownerUserId: user.id,
    accountEmail: user.email,
    createdAt: user.createdAt,
    nomeRazaoSocial: profile?.nomeRazaoSocial?.trim() || null,
    emailLocador: profile?.emailLocador?.trim() || null,
    cpfCnpj: profile?.cpfCnpj || "",
    phone: profile?.phone || "",
    cidade: profile?.cidade?.trim() || null,
    uf: profile?.uf?.trim() || null,
    vehicleCount: user._count.vehicles,
    hasContractTemplate: Boolean(profile?.contractTemplateText?.trim()),
    profileIssues: issues,
    profileComplete: issues.length === 0,
  };
}

export const adminOwnersRouter = router({
  list: adminProcedure.query(async () => {
    const owners = await prisma.user.findMany({
      where: { role: "OWNER" },
      include: {
        ownerProfile: true,
        _count: { select: { vehicles: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return owners.map(serializeOwnerListItem);
  }),

  getDetail: adminProcedure
    .input(z.object({ ownerUserId: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findFirst({
        where: { id: input.ownerUserId, role: "OWNER" },
        include: {
          ownerProfile: true,
          vehicles: {
            orderBy: { updatedAt: "desc" },
            include: {
              photos: { orderBy: { sortOrder: "asc" }, take: 1 },
              _count: { select: { photos: true } },
            },
          },
        },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Locador não encontrado",
        });
      }

      const vehicleIds = user.vehicles.map((v) => v.id);
      const activeRentalCounts =
        vehicleIds.length === 0
          ? new Map<string, number>()
          : new Map(
              (
                await prisma.rental.groupBy({
                  by: ["vehicleId"],
                  where: {
                    vehicleId: { in: vehicleIds },
                    status: "ACTIVE",
                  },
                  _count: { _all: true },
                })
              ).map((row) => [row.vehicleId, row._count._all])
            );

      const profile = user.ownerProfile;
      const issues = ownerProfileIssues(profile);

      const vehicles = await Promise.all(
        user.vehicles.map(async (v) => {
          const thumbKey = v.photos[0]?.key;
          return {
            id: v.id,
            title: v.title,
            plate: v.plate,
            brand: v.brand,
            model: v.model,
            year: v.year,
            cor: v.cor,
            vehicleType: v.vehicleType,
            contractTime: v.contractTime,
            dailyRateCents: v.dailyRateCents,
            available: v.available,
            highlightTier: effectiveHighlightTier(v),
            highlightExpiresAt: v.highlightExpiresAt,
            photoCount: v._count.photos,
            thumbUrl: await photoUrlForKey(thumbKey),
            activeRentalsCount: activeRentalCounts.get(v.id) ?? 0,
            updatedAt: v.updatedAt,
          };
        })
      );

      return {
        ownerUserId: user.id,
        accountEmail: user.email,
        createdAt: user.createdAt,
        profile: profile
          ? {
              nomeRazaoSocial: profile.nomeRazaoSocial,
              emailLocador: profile.emailLocador,
              contractTemplateText: profile.contractTemplateText,
              cpfCnpj: profile.cpfCnpj,
              phone: profile.phone,
              cep: profile.cep,
              logradouro: profile.logradouro,
              numero: profile.numero,
              complemento: profile.complemento,
              bairro: profile.bairro,
              cidade: profile.cidade,
              uf: profile.uf,
              averageRating: profile.averageRating,
              ratingCount: profile.ratingCount,
            }
          : null,
        profileIssues: issues,
        profileComplete: issues.length === 0,
        vehicleCount: vehicles.length,
        vehicles,
      };
    }),

  getVehicle: adminProcedure
    .input(z.object({ vehicleId: z.string() }))
    .query(async ({ input }) => {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: input.vehicleId },
        include: {
          photos: { orderBy: { sortOrder: "asc" } },
          owner: {
            select: {
              id: true,
              email: true,
              ownerProfile: { select: { nomeRazaoSocial: true } },
            },
          },
        },
      });
      if (!vehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não encontrado",
        });
      }

      const [activeRentalsCount, totalRentalsCount] = await Promise.all([
        prisma.rental.count({
          where: { vehicleId: vehicle.id, status: "ACTIVE" },
        }),
        prisma.rental.count({ where: { vehicleId: vehicle.id } }),
      ]);

      const photos = await Promise.all(
        vehicle.photos.map(async (p) => ({
          id: p.id,
          photoUrl: await photoUrlForKey(p.key),
          sortOrder: p.sortOrder,
        }))
      );

      return {
        id: vehicle.id,
        ownerUserId: vehicle.owner.id,
        ownerName:
          vehicle.owner.ownerProfile?.nomeRazaoSocial?.trim() ||
          vehicle.owner.email,
        ownerEmail: vehicle.owner.email,
        title: vehicle.title,
        description: vehicle.description,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        cor: vehicle.cor,
        vehicleType: vehicle.vehicleType,
        portas: vehicle.portas,
        lugares: vehicle.lugares,
        contractTime: vehicle.contractTime,
        dailyRateCents: vehicle.dailyRateCents,
        available: vehicle.available,
        kmLivre: vehicle.kmLivre,
        kmPorContrato: vehicle.kmPorContrato,
        insuranceMaintenanceIncluded: vehicle.insuranceMaintenanceIncluded,
        paymentNotes: vehicle.paymentNotes,
        caucao: vehicle.caucao,
        pickupCity: vehicle.pickupCity,
        pickupUf: vehicle.pickupUf,
        pickupSameAsOwner: vehicle.pickupSameAsOwner,
        highlightTier: effectiveHighlightTier(vehicle),
        highlightExpiresAt: vehicle.highlightExpiresAt,
        activeRentalsCount,
        totalRentalsCount,
        photos,
        createdAt: vehicle.createdAt,
        updatedAt: vehicle.updatedAt,
      };
    }),
});
