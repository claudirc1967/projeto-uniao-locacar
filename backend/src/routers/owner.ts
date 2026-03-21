import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  type AllowedContentType,
  buildVehiclePhotoKey,
  presignGetRead,
  presignPutUpload,
} from "../storage/s3.js";
import type { AuthedContext } from "../context.js";
import { isDriverBlockedFromVehicleRequest } from "../driverVehicleBlock.js";
import { ownerProcedure, router } from "../trpc.js";

const contentTypeSchema = z.enum(
  ALLOWED_CONTENT_TYPES as unknown as [string, ...string[]]
);

const fileMeta = z.object({
  contentType: contentTypeSchema,
  fileName: z.string().min(1).max(200).optional(),
  byteSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

const contractTimeSchema = z.enum(["DIARIO", "SEMANAL", "MENSAL"]);

const ownerProfileInput = z
  .object({
    cpfCnpj: z.string().min(11).max(18),
    phone: z.string().min(8).max(20),
    cep: z.string().min(8).max(9),
    logradouro: z.string().min(1),
    bairro: z.string().min(1),
    cidade: z.string().min(1),
    uf: z.string().length(2),
    numero: z.string().min(1),
    complemento: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const d = data.cpfCnpj.replace(/\D/g, "");
    if (d.length !== 11 && d.length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF deve ter 11 dígitos ou CNPJ 14 dígitos",
        path: ["cpfCnpj"],
      });
    }
  });

async function assertOwnsVehicle(ownerUserId: string, vehicleId: string) {
  const v = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerUserId },
  });
  if (!v) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Veículo não encontrado",
    });
  }
  return v;
}

async function withPhotoUrls<T extends { key: string }>(
  photos: T[]
): Promise<(T & { photoUrl: string })[]> {
  return Promise.all(
    photos.map(async (p) => ({
      ...p,
      photoUrl: await presignGetRead(p.key, 3600),
    }))
  );
}

export const ownerRouter = router({
  createVehicle: ownerProcedure
    .input(
      z.object({
        title: z.string().min(2),
        description: z.string().optional(),
        plate: z.string().min(5),
        brand: z.string().optional(),
        model: z.string().optional(),
        year: z.number().int().min(1900).max(2100).optional(),
        cor: z.string().optional(),
        contractTime: contractTimeSchema.default("DIARIO"),
        kmLivre: z.boolean().default(false),
        kmPorContrato: z.number().int().min(0).default(0),
        insuranceMaintenanceIncluded: z.boolean().default(true),
        insurerPolicy: z.string().optional().nullable(),
        dailyRateCents: z.number().int().positive(),
        available: z.boolean().default(true),
        requirementsJson: z.string().optional(),
        paymentNotes: z.string().optional(),
        pickupCity: z.string().optional(),
        pickupUf: z.string().max(2).optional(),

        pickupCep: z.string().optional(),
        pickupLogradouro: z.string().optional(),
        pickupNumero: z.string().optional(),
        pickupComplemento: z.string().optional(),
        pickupBairro: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx as AuthedContext;
      const v = await prisma.vehicle.create({
        data: {
          ownerUserId: user.id,
          title: input.title,
          description: input.description,
          plate: input.plate,
          brand: input.brand,
          model: input.model,
          year: input.year,
          cor: input.cor,
          contractTime: input.contractTime,
          kmLivre: input.kmLivre,
          kmPorContrato: input.kmPorContrato,
          insuranceMaintenanceIncluded: input.insuranceMaintenanceIncluded,
          insurerPolicy: input.insuranceMaintenanceIncluded
            ? input.insurerPolicy ?? undefined
            : null,
          dailyRateCents: input.dailyRateCents,
          available: input.available,
          requirementsJson: input.requirementsJson,
          paymentNotes: input.paymentNotes,
          pickupCity: input.pickupCity,
          pickupUf: input.pickupUf,

          pickupCep: input.pickupCep,
          pickupLogradouro: input.pickupLogradouro,
          pickupNumero: input.pickupNumero,
          pickupComplemento: input.pickupComplemento,
          pickupBairro: input.pickupBairro,
        },
      });
      return { vehicleId: v.id };
    }),

  updateVehicle: ownerProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        title: z.string().min(2).optional(),
        description: z.string().optional().nullable(),
        plate: z.string().min(5).optional(),
        brand: z.string().optional().nullable(),
        model: z.string().optional().nullable(),
        year: z.number().int().min(1900).max(2100).optional().nullable(),
        cor: z.string().optional().nullable(),
        contractTime: contractTimeSchema.optional(),
        kmLivre: z.boolean().optional(),
        kmPorContrato: z.number().int().min(0).optional(),
        insuranceMaintenanceIncluded: z.boolean().optional(),
        insurerPolicy: z.string().optional().nullable(),
        dailyRateCents: z.number().int().positive().optional(),
        available: z.boolean().optional(),
        requirementsJson: z.string().optional().nullable(),
        paymentNotes: z.string().optional().nullable(),
        pickupCity: z.string().optional().nullable(),
        pickupUf: z.string().max(2).optional().nullable(),

        pickupCep: z.string().optional().nullable(),
        pickupLogradouro: z.string().optional().nullable(),
        pickupNumero: z.string().optional().nullable(),
        pickupComplemento: z.string().optional().nullable(),
        pickupBairro: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnsVehicle((ctx as AuthedContext).user.id, input.vehicleId);
      const { vehicleId, ...rest } = input;
      const data = { ...rest };
      if (data.insuranceMaintenanceIncluded === false) {
        data.insurerPolicy = null;
      }
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data,
      });
      return { ok: true as const };
    }),

  listMyVehicles: ownerProcedure.query(async ({ ctx }) => {
    const list = await prisma.vehicle.findMany({
      where: { ownerUserId: (ctx as AuthedContext).user.id },
      orderBy: { updatedAt: "desc" },
      include: { photos: { orderBy: { sortOrder: "asc" } } },
    });
    try {
      return await Promise.all(
        list.map(async (v) => ({
          ...v,
          photos: await withPhotoUrls(v.photos),
        }))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro no storage";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: msg,
      });
    }
  }),

  getMyVehicle: ownerProcedure
    .input(z.object({ vehicleId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsVehicle((ctx as AuthedContext).user.id, input.vehicleId);
      const v = await prisma.vehicle.findUniqueOrThrow({
        where: { id: input.vehicleId },
        include: { photos: { orderBy: { sortOrder: "asc" } } },
      });
      return {
        ...v,
        photos: await withPhotoUrls(v.photos),
      };
    }),

  updateMyOwnerProfile: ownerProcedure
    .input(ownerProfileInput)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx as AuthedContext;
      await prisma.ownerProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
          phone: input.phone,
          cep: input.cep.replace(/\D/g, ""),
          logradouro: input.logradouro,
          bairro: input.bairro,
          cidade: input.cidade,
          uf: input.uf.toUpperCase(),
          numero: input.numero,
          complemento: input.complemento,
        },
        update: {
          cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
          phone: input.phone,
          cep: input.cep.replace(/\D/g, ""),
          logradouro: input.logradouro,
          bairro: input.bairro,
          cidade: input.cidade,
          uf: input.uf.toUpperCase(),
          numero: input.numero,
          complemento: input.complemento,
        },
      });
      return { ok: true as const };
    }),

  requestVehiclePhotoUploads: ownerProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        files: z.array(fileMeta).min(1).max(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnsVehicle((ctx as AuthedContext).user.id, input.vehicleId);
      const existing = await prisma.vehiclePhoto.count({
        where: { vehicleId: input.vehicleId },
      });
      if (existing + input.files.length > 6) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Máximo de 6 fotos por veículo",
        });
      }
      try {
        const items = await Promise.all(
          input.files.map(async (f) => {
            const key = buildVehiclePhotoKey(input.vehicleId, f.fileName);
            const { uploadUrl } = await presignPutUpload(
              key,
              f.contentType as AllowedContentType
            );
            return {
              uploadUrl,
              key,
              contentType: f.contentType,
              requiredHeaders: {
                "Content-Type": f.contentType,
              } as Record<string, string>,
            };
          })
        );
        return { items };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao gerar upload";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  addVehiclePhotos: ownerProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        photos: z
          .array(
            z.object({
              key: z.string(),
              contentType: contentTypeSchema,
              byteSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
              sortOrder: z.number().int().optional(),
            })
          )
          .min(1)
          .max(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnsVehicle((ctx as AuthedContext).user.id, input.vehicleId);
      const existing = await prisma.vehiclePhoto.count({
        where: { vehicleId: input.vehicleId },
      });
      if (existing + input.photos.length > 6) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Máximo de 6 fotos por veículo",
        });
      }
      const baseOrder = existing;
      await prisma.$transaction(
        input.photos.map((p, i) =>
          prisma.vehiclePhoto.create({
            data: {
              vehicleId: input.vehicleId,
              key: p.key,
              contentType: p.contentType,
              byteSize: p.byteSize,
              sortOrder: p.sortOrder ?? baseOrder + i,
            },
          })
        )
      );
      return { ok: true as const };
    }),

  /** URLs de leitura para keys já persistidas (ex.: refresh de cache). */
  getVehiclePhotoReadUrls: ownerProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        keys: z.array(z.string()).min(1).max(12),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertOwnsVehicle((ctx as AuthedContext).user.id, input.vehicleId);
      const rows = await prisma.vehiclePhoto.findMany({
        where: { vehicleId: input.vehicleId, key: { in: input.keys } },
      });
      try {
        return {
          items: await withPhotoUrls(rows),
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro no storage";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: msg,
        });
      }
    }),

  listPendingDrivers: ownerProcedure.query(async () => {
    const profiles = await prisma.driverProfile.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, email: true, createdAt: true } } },
    });
    profiles.sort(
      (a, b) => a.user.createdAt.getTime() - b.user.createdAt.getTime()
    );
    return profiles.map((p) => ({
      driverUserId: p.userId,
      email: p.user.email,
      fullName: p.fullName,
      phone: p.phone,
      cpf: p.cpf,
      cnh: p.cnh,
      createdAt: p.user.createdAt,
    }));
  }),

  getDriverProfile: ownerProcedure
    .input(z.object({ driverUserId: z.string() }))
    .query(async ({ input }) => {
      const profile = await prisma.driverProfile.findUnique({
        where: { userId: input.driverUserId },
        include: { user: { select: { id: true, email: true } } },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Motorista não encontrado",
        });
      }

      return {
        driverUserId: profile.userId,
        email: profile.user.email,
        status: profile.status,
        fullName: profile.fullName,
        phone: profile.phone,
        cpf: profile.cpf,
        cnh: profile.cnh,
        cnhCategory: profile.cnhCategory,
        cnhValidity: profile.cnhValidity,
        cnhYears: profile.cnhYears,
        cnhHasEar: profile.cnhHasEar,
        criminalAttestation: profile.criminalAttestation,
        uberRegistered: profile.uberRegistered,
        cep: profile.cep,
        logradouro: profile.logradouro,
        numero: profile.numero,
        complemento: profile.complemento,
        bairro: profile.bairro,
        cidade: profile.cidade,
        uf: profile.uf,
      };
    }),

  approveDriver: ownerProcedure
    .input(z.object({ driverUserId: z.string() }))
    .mutation(async ({ input }) => {
      const p = await prisma.driverProfile.findUnique({
        where: { userId: input.driverUserId },
      });
      if (!p) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Motorista não encontrado" });
      }
      await prisma.driverProfile.update({
        where: { userId: input.driverUserId },
        data: { status: "APPROVED" },
      });
      return { ok: true as const };
    }),

  rejectDriver: ownerProcedure
    .input(z.object({ driverUserId: z.string() }))
    .mutation(async ({ input }) => {
      const p = await prisma.driverProfile.findUnique({
        where: { userId: input.driverUserId },
      });
      if (!p) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Motorista não encontrado" });
      }
      await prisma.driverProfile.update({
        where: { userId: input.driverUserId },
        data: { status: "REJECTED" },
      });
      return { ok: true as const };
    }),

  listIncomingRentals: ownerProcedure.query(async ({ ctx }) => {
    const rentals = await prisma.rental.findMany({
      where: { vehicle: { ownerUserId: (ctx as AuthedContext).user.id } },
      orderBy: { requestedAt: "desc" },
      include: {
        vehicle: { select: { id: true, title: true, plate: true } },
        driver: {
          select: {
            id: true,
            email: true,
            driverProfile: true,
          },
        },
      },
    });
    return Promise.all(
      rentals.map(async (r) => ({
        ...r,
        driverRequestBlocked:
          r.status === "REJECTED"
            ? await isDriverBlockedFromVehicleRequest(
                r.vehicleId,
                r.driverUserId
              )
            : false,
      }))
    );
  }),

  approveRental: ownerProcedure
    .input(z.object({ rentalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const r = await prisma.rental.findFirst({
        where: {
          id: input.rentalId,
          vehicle: { ownerUserId: (ctx as AuthedContext).user.id },
          status: "PENDING_OWNER",
        },
      });
      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      await prisma.$transaction([
        prisma.rental.update({
          where: { id: r.id },
          data: { status: "APPROVED" },
        }),
        // Ao aprovar a locação, impedimos que o motorista solicite novamente
        // o mesmo veículo enquanto essa locação estiver em andamento.
        prisma.vehicle.update({
          where: { id: r.vehicleId },
          data: { available: false },
        }),
      ]);
      return { ok: true as const };
    }),

  rejectRental: ownerProcedure
    .input(
      z.object({
        rentalId: z.string(),
        motivoRecusa: z.string().min(3).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const r = await prisma.rental.findFirst({
        where: {
          id: input.rentalId,
          vehicle: { ownerUserId: (ctx as AuthedContext).user.id },
          status: "PENDING_OWNER",
        },
      });
      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }
      await prisma.$transaction([
        prisma.rental.update({
          where: { id: r.id },
          data: {
            status: "REJECTED",
            motivoRecusa: input.motivoRecusa.trim(),
          },
        }),
        prisma.vehicleDriverBlock.upsert({
          where: {
            vehicleId_driverUserId: {
              vehicleId: r.vehicleId,
              driverUserId: r.driverUserId,
            },
          },
          create: {
            vehicleId: r.vehicleId,
            driverUserId: r.driverUserId,
            active: true,
          },
          update: { active: true },
        }),
      ]);
      return { ok: true as const };
    }),

  /** Permite ao motorista voltar a solicitar aluguel deste veículo após uma recusa. */
  unblockDriverAfterRejection: ownerProcedure
    .input(z.object({ rentalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const r = await prisma.rental.findFirst({
        where: {
          id: input.rentalId,
          vehicle: { ownerUserId: (ctx as AuthedContext).user.id },
          status: "REJECTED",
        },
      });
      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação recusada não encontrada",
        });
      }
      await prisma.vehicleDriverBlock.upsert({
        where: {
          vehicleId_driverUserId: {
            vehicleId: r.vehicleId,
            driverUserId: r.driverUserId,
          },
        },
        create: {
          vehicleId: r.vehicleId,
          driverUserId: r.driverUserId,
          active: false,
        },
        update: { active: false },
      });
      return { ok: true as const };
    }),

  /** Exclui uma solicitação recusada. */
  deleteRejectedRental: ownerProcedure
    .input(z.object({ rentalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const r = await prisma.rental.findFirst({
        where: {
          id: input.rentalId,
          vehicle: { ownerUserId: (ctx as AuthedContext).user.id },
          status: "REJECTED",
        },
      });
      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação recusada não encontrada",
        });
      }
      await prisma.rental.delete({ where: { id: r.id } });
      return { ok: true as const };
    }),

  getIncomingRentalDetail: ownerProcedure
    .input(z.object({ rentalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const r = await prisma.rental.findFirst({
        where: {
          id: input.rentalId,
          vehicle: { ownerUserId: (ctx as AuthedContext).user.id },
        },
        include: {
          vehicle: {
            select: {
              id: true,
              title: true,
              plate: true,
              brand: true,
              model: true,
              year: true,
              cor: true,
              dailyRateCents: true,
            },
          },
          driver: {
            select: {
              id: true,
              email: true,
              driverProfile: {
                select: {
                  fullName: true,
                  phone: true,
                  cpf: true,
                  cnh: true,
                  cnhCategory: true,
                  cnhValidity: true,
                  cnhYears: true,
                  cnhHasEar: true,
                  criminalAttestation: true,
                  uberRegistered: true,
                  cep: true,
                  logradouro: true,
                  numero: true,
                  complemento: true,
                  bairro: true,
                  cidade: true,
                  uf: true,
                },
              },
            },
          },
        },
      });

      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      return {
        rentalId: r.id,
        status: r.status,
        requestedAt: r.requestedAt,
        updatedAt: r.updatedAt,
        motivoRecusa: r.motivoRecusa,
        driverRequestBlocked:
          r.status === "REJECTED"
            ? await isDriverBlockedFromVehicleRequest(
                r.vehicleId,
                r.driverUserId
              )
            : false,
        pickupInstructions: r.pickupInstructions,
        contractText: r.contractText,
        contractUrl: r.contractUrl,
        vehicle: r.vehicle,
        driver: r.driver,
      };
    }),

  setRentalPickupAndContract: ownerProcedure
    .input(
      z.object({
        rentalId: z.string(),
        pickupInstructions: z.string().min(3),
        contractText: z.string().optional().nullable(),
        contractUrl: z.preprocess(
          (v) => (typeof v === "string" && v.trim() === "" ? null : v),
          z.string().url().nullable().optional()
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const r = await prisma.rental.findFirst({
        where: {
          id: input.rentalId,
          vehicle: { ownerUserId: (ctx as AuthedContext).user.id },
          status: { in: ["APPROVED", "ACTIVE"] },
        },
      });
      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Locação não encontrada ou ainda não aprovada",
        });
      }
      await prisma.rental.update({
        where: { id: r.id },
        data: {
          pickupInstructions: input.pickupInstructions,
          contractText: input.contractText ?? undefined,
          contractUrl: input.contractUrl ?? undefined,
          status: "ACTIVE",
        },
      });
      return { ok: true as const };
    }),
});
