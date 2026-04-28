import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  type AllowedContentType,
  buildVehiclePhotoKey,
  deleteObject,
  presignGetRead,
  presignPutUpload,
} from "../storage/s3.js";
import type { AuthedContext } from "../context.js";
import { isDriverBlockedFromVehicleRequest } from "../driverVehicleBlock.js";
import { ownerProcedure, router } from "../trpc.js";
import { sendEmail } from "../email/consoleEmail.js";
import { fillRentalContract } from "../contracts/fillRentalContract.js";
import { rentalContractTemplate } from "../contracts/rentalContractTemplate.js";
import { contractTextToPdfBytes } from "../contracts/contractPdf.js";
import { putObjectBuffer } from "../storage/s3.js";
import { cpfCnpjValidationMessage } from "../validation/cpfCnpj.js";

const contentTypeSchema = z.enum(
  ALLOWED_CONTENT_TYPES as unknown as [string, ...string[]]
);

const fileMeta = z.object({
  contentType: contentTypeSchema,
  fileName: z.string().min(1).max(200).optional(),
  byteSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

const contractTimeSchema = z.enum(["DIARIO", "SEMANAL", "MENSAL"]);
const rentalPaymentStatusSchema = z.enum([
  "PENDING",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);
const rentalFinancialEntryTypeSchema = z.enum([
  "RENT_PAYMENT",
  "SECURITY_DEPOSIT",
  "DISCOUNT",
  "EXTRA_CHARGE",
  "REFUND",
]);
const rentalPaymentMethodSchema = z.enum([
  "PIX",
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "OTHER",
]);
const partnerCategorySchema = z.enum([
  "INSURANCE",
  "WORKSHOP",
  "BODYSHOP",
  "PARTS",
  "OTHER",
]);

const ownerProfileInput = z
  .object({
    nomeRazaoSocial: z.string().min(1),
    emailLocador: z.string().email(),
    contractTemplateText: z.string().optional().nullable(),
    cpfCnpj: z.string().min(11).max(18),
    phone: z.string().min(8).max(20),
    cep: z.string().min(8).max(9),
    logradouro: z.string().min(1),
    bairro: z.string().min(1),
    cidade: z.string().min(1),
    uf: z.string().length(2),
    numero: z.string().min(1),
    complemento: z.string().max(200),
  })
  .superRefine((data, ctx) => {
    const msg = cpfCnpjValidationMessage(data.cpfCnpj);
    if (msg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: msg,
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

async function assertOwnsRental(ownerUserId: string, rentalId: string) {
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, vehicle: { ownerUserId } },
    select: { id: true },
  });
  if (!rental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Locação não encontrada para este locador",
    });
  }
  return rental;
}

async function assertPartnersBelongToOwner(
  ownerUserId: string,
  partnerIds: Array<string | null | undefined>
) {
  const ids = Array.from(
    new Set(
      partnerIds
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return;
  const count = await prisma.partner.count({
    where: { id: { in: ids }, ownerUserId },
  });
  if (count !== ids.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Parceiro inválido (não encontrado ou não pertence ao proprietário).",
    });
  }
}

async function assertOwnsPartner(ownerUserId: string, partnerId: string) {
  const p = await prisma.partner.findFirst({
    where: { id: partnerId, ownerUserId },
  });
  if (!p) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Parceiro não encontrado",
    });
  }
  return p;
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

function financialTotals(
  summary: { agreedAmountCents: number } | null,
  entries: Array<{ type: string; amountCents: number }>
) {
  const sumByType = (type: string) =>
    entries
      .filter((entry) => entry.type === type)
      .reduce((total, entry) => total + entry.amountCents, 0);

  const rentPaidAmountCents = sumByType("RENT_PAYMENT");
  const securityDepositPaidCents = sumByType("SECURITY_DEPOSIT");
  const discountCents = sumByType("DISCOUNT");
  const extraChargeCents = sumByType("EXTRA_CHARGE");
  const refundCents = sumByType("REFUND");
  const balanceCents = summary
    ? Math.max(
        0,
        summary.agreedAmountCents +
          extraChargeCents -
          discountCents -
          rentPaidAmountCents
      )
    : 0;

  return {
    rentPaidAmountCents,
    securityDepositPaidCents,
    discountCents,
    extraChargeCents,
    refundCents,
    balanceCents,
  };
}

export const ownerRouter = router({
  listMyPartners: ownerProcedure
    .input(
      z.object({
        category: partnerCategorySchema.optional(),
        nameContains: z.string().max(200).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      const name = input.nameContains?.trim();
      return prisma.partner.findMany({
        where: {
          ownerUserId,
          category: input.category,
          ...(name ? { name: { contains: name } } : {}),
        },
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    }),

  createPartner: ownerProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        category: partnerCategorySchema.default("OTHER"),
        email: z.string().email().optional().nullable(),
        phone: z.string().min(8).max(30).optional().nullable(),
        notes: z.string().max(4000).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      const p = await prisma.partner.create({
        data: {
          ownerUserId,
          name: input.name.trim(),
          category: input.category,
          email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
          phone: input.phone?.trim() ? input.phone.trim() : null,
          notes: input.notes?.trim() ? input.notes.trim() : null,
        },
      });
      return { partnerId: p.id };
    }),

  updatePartner: ownerProcedure
    .input(
      z.object({
        partnerId: z.string(),
        name: z.string().min(2).max(200).optional(),
        category: partnerCategorySchema.optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().min(8).max(30).optional().nullable(),
        notes: z.string().max(4000).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      await assertOwnsPartner(ownerUserId, input.partnerId);
      await prisma.partner.update({
        where: { id: input.partnerId },
        data: {
          name: input.name?.trim(),
          category: input.category,
          email:
            input.email === undefined
              ? undefined
              : input.email?.trim()
                ? input.email.trim().toLowerCase()
                : null,
          phone:
            input.phone === undefined
              ? undefined
              : input.phone?.trim()
                ? input.phone.trim()
                : null,
          notes:
            input.notes === undefined
              ? undefined
              : input.notes?.trim()
                ? input.notes.trim()
                : null,
        },
      });
      return { ok: true as const };
    }),

  deletePartner: ownerProcedure
    .input(z.object({ partnerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      await assertOwnsPartner(ownerUserId, input.partnerId);
      await prisma.partner.delete({ where: { id: input.partnerId } });
      return { ok: true as const };
    }),

  createVehicle: ownerProcedure
    .input(
      z.object({
        title: z.string().min(2),
        description: z.string().optional(),
        plate: z.string().min(5),
        brand: z.string().optional(),
        model: z.string().optional(),
        year: z.number().int().min(1900).max(2100),
        cor: z.string().optional(),
        portas: z.number().int().min(2).max(8).default(4),
        lugares: z.number().int().min(1).max(15).default(5),
        contractTime: contractTimeSchema.default("DIARIO"),
        kmLivre: z.boolean().default(false),
        kmPorContrato: z.number().int().min(0).default(0),
        insuranceMaintenanceIncluded: z.boolean().default(true),
        insurerPolicy: z.string().optional().nullable(),

        insurancePartnerId: z.string().optional().nullable(),
        workshopPartnerId: z.string().optional().nullable(),
        bodyshopPartnerId: z.string().optional().nullable(),
        partsPartnerId: z.string().optional().nullable(),

        dailyRateCents: z.number().int().positive(),
        available: z.boolean().default(true),
        requirementsJson: z.string().optional(),
        paymentNotes: z.string().optional(),
        caucao: z.string().optional().nullable(),
        pickupCity: z.string().optional(),
        pickupUf: z.string().max(2).optional(),

        pickupCep: z.string().optional(),
        pickupLogradouro: z.string().optional(),
        pickupNumero: z.string().optional(),
        pickupComplemento: z.string().optional(),
        pickupBairro: z.string().optional(),
        pickupSameAsOwner: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx as AuthedContext;
      await assertPartnersBelongToOwner(user.id, [
        input.insurancePartnerId,
        input.workshopPartnerId,
        input.bodyshopPartnerId,
        input.partsPartnerId,
      ]);
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
          portas: input.portas,
          lugares: input.lugares,
          contractTime: input.contractTime,
          kmLivre: input.kmLivre,
          kmPorContrato: input.kmPorContrato,
          insuranceMaintenanceIncluded: input.insuranceMaintenanceIncluded,
          insurerPolicy: input.insuranceMaintenanceIncluded
            ? input.insurerPolicy ?? undefined
            : null,
          insurancePartnerId: input.insurancePartnerId ?? undefined,
          workshopPartnerId: input.workshopPartnerId ?? undefined,
          bodyshopPartnerId: input.bodyshopPartnerId ?? undefined,
          partsPartnerId: input.partsPartnerId ?? undefined,
          dailyRateCents: input.dailyRateCents,
          available: input.available,
          requirementsJson: input.requirementsJson,
          paymentNotes: input.paymentNotes,
          caucao: input.caucao,
          pickupCity: input.pickupCity,
          pickupUf: input.pickupUf,

          pickupCep: input.pickupCep,
          pickupLogradouro: input.pickupLogradouro,
          pickupNumero: input.pickupNumero,
          pickupComplemento: input.pickupComplemento,
          pickupBairro: input.pickupBairro,
          pickupSameAsOwner: input.pickupSameAsOwner ?? false,
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
        year: z.number().int().min(1900).max(2100).optional(),
        cor: z.string().optional().nullable(),
        portas: z.number().int().min(2).max(8).optional(),
        lugares: z.number().int().min(1).max(15).optional(),
        contractTime: contractTimeSchema.optional(),
        kmLivre: z.boolean().optional(),
        kmPorContrato: z.number().int().min(0).optional(),
        insuranceMaintenanceIncluded: z.boolean().optional(),
        insurerPolicy: z.string().optional().nullable(),

        insurancePartnerId: z.string().optional().nullable(),
        workshopPartnerId: z.string().optional().nullable(),
        bodyshopPartnerId: z.string().optional().nullable(),
        partsPartnerId: z.string().optional().nullable(),

        dailyRateCents: z.number().int().positive().optional(),
        available: z.boolean().optional(),
        requirementsJson: z.string().optional().nullable(),
        paymentNotes: z.string().optional().nullable(),
        caucao: z.string().optional().nullable(),
        pickupCity: z.string().optional().nullable(),
        pickupUf: z.string().max(2).optional().nullable(),

        pickupCep: z.string().optional().nullable(),
        pickupLogradouro: z.string().optional().nullable(),
        pickupNumero: z.string().optional().nullable(),
        pickupComplemento: z.string().optional().nullable(),
        pickupBairro: z.string().optional().nullable(),
        pickupSameAsOwner: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      await assertOwnsVehicle(ownerUserId, input.vehicleId);
      await assertPartnersBelongToOwner(ownerUserId, [
        input.insurancePartnerId,
        input.workshopPartnerId,
        input.bodyshopPartnerId,
        input.partsPartnerId,
      ]);
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
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        insurancePartner: true,
        workshopPartner: true,
        bodyshopPartner: true,
        partsPartner: true,
      },
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
        include: {
          photos: { orderBy: { sortOrder: "asc" } },
          insurancePartner: true,
          workshopPartner: true,
          bodyshopPartner: true,
          partsPartner: true,
        },
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
          nomeRazaoSocial: input.nomeRazaoSocial,
          emailLocador: input.emailLocador.trim().toLowerCase(),
          contractTemplateText: input.contractTemplateText?.trim()
            ? input.contractTemplateText
            : null,
          cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
          phone: input.phone,
          cep: input.cep.replace(/\D/g, ""),
          logradouro: input.logradouro,
          bairro: input.bairro,
          cidade: input.cidade,
          uf: input.uf.toUpperCase(),
          numero: input.numero,
          complemento: input.complemento.trim(),
        },
        update: {
          nomeRazaoSocial: input.nomeRazaoSocial,
          emailLocador: input.emailLocador.trim().toLowerCase(),
          contractTemplateText: input.contractTemplateText?.trim()
            ? input.contractTemplateText
            : null,
          cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
          phone: input.phone,
          cep: input.cep.replace(/\D/g, ""),
          logradouro: input.logradouro,
          bairro: input.bairro,
          cidade: input.cidade,
          uf: input.uf.toUpperCase(),
          numero: input.numero,
          complemento: input.complemento.trim(),
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

  deleteVehiclePhoto: ownerProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        photoId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnsVehicle((ctx as AuthedContext).user.id, input.vehicleId);
      const row = await prisma.vehiclePhoto.findFirst({
        where: { id: input.photoId, vehicleId: input.vehicleId },
      });
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Foto não encontrada",
        });
      }
      try {
        await deleteObject(row.key);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao remover arquivo no storage";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: msg,
        });
      }
      await prisma.vehiclePhoto.delete({ where: { id: row.id } });
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

  listRejectedDrivers: ownerProcedure.query(async () => {
    const profiles = await prisma.driverProfile.findMany({
      where: { status: "REJECTED" },
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
        rejectionReason: profile.rejectionReason,
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
      if (p.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível aprovar motoristas com cadastro pendente.",
        });
      }
      await prisma.driverProfile.update({
        where: { userId: input.driverUserId },
        data: { status: "APPROVED", rejectionReason: null },
      });
      return { ok: true as const };
    }),

  rejectDriver: ownerProcedure
    .input(
      z.object({
        driverUserId: z.string(),
        motivo: z.string().min(3).max(2000),
      })
    )
    .mutation(async ({ input }) => {
      const p = await prisma.driverProfile.findUnique({
        where: { userId: input.driverUserId },
      });
      if (!p) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Motorista não encontrado" });
      }
      if (p.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível rejeitar motoristas com cadastro pendente.",
        });
      }
      await prisma.driverProfile.update({
        where: { userId: input.driverUserId },
        data: {
          status: "REJECTED",
          rejectionReason: input.motivo.trim(),
        },
      });
      return { ok: true as const };
    }),

  /** Recoloca cadastro rejeitado na fila de análise (volta para pendente). */
  reopenDriverForReview: ownerProcedure
    .input(z.object({ driverUserId: z.string() }))
    .mutation(async ({ input }) => {
      const p = await prisma.driverProfile.findUnique({
        where: { userId: input.driverUserId },
      });
      if (!p) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Motorista não encontrado" });
      }
      if (p.status !== "REJECTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível recolocar na análise cadastros rejeitados.",
        });
      }
      await prisma.driverProfile.update({
        where: { userId: input.driverUserId },
        data: { status: "PENDING", rejectionReason: null },
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
        include: {
          driver: { select: { email: true, driverProfile: true } },
          vehicle: true,
        },
      });
      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      const owner = (ctx as AuthedContext).user;
      const baseTemplate =
        owner.ownerProfile?.contractTemplateText?.trim() || rentalContractTemplate;
      const contractText = fillRentalContract(baseTemplate, {
        rental: { id: r.id },
        vehicle: {
          title: r.vehicle.title,
          plate: r.vehicle.plate,
          brand: r.vehicle.brand,
          model: r.vehicle.model,
          year: r.vehicle.year,
          cor: r.vehicle.cor,
          paymentNotes: r.vehicle.paymentNotes,
          caucao: r.vehicle.caucao,
          contractTime: r.vehicle.contractTime,
          dailyRateCents: r.vehicle.dailyRateCents,
        },
        owner: {
          email: owner.email,
          ownerProfile: owner.ownerProfile,
        },
        driver: {
          email: r.driver.email,
          driverProfile: r.driver.driverProfile,
        },
      });

      await prisma.$transaction([
        prisma.rental.update({
          where: { id: r.id },
          data: { status: "APPROVED", contractText },
        }),
        // Ao aprovar a locação, impedimos que o motorista solicite novamente
        // o mesmo veículo enquanto essa locação estiver em andamento.
        prisma.vehicle.update({
          where: { id: r.vehicleId },
          data: { available: false },
        }),
      ]);

      const to = r.driver.email?.trim();
      if (to) {
        void sendEmail({
          to,
          subject: "Solicitação de locação aprovada",
          text: [
            "Sua solicitação de locação foi aprovada.",
            "",
            `Veículo: ${r.vehicle.title ?? "—"} (${r.vehicle.plate})`,
            `Rental ID: ${r.id}`,
          ].join("\n"),
        }).catch(() => {
          /* não falha a aprovação por e-mail */
        });
      }
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
        include: {
          driver: { select: { email: true } },
          vehicle: { select: { title: true, plate: true } },
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

      const to = r.driver.email?.trim();
      if (to) {
        void sendEmail({
          to,
          subject: "Solicitação de locação recusada",
          text: [
            "Sua solicitação de locação foi recusada.",
            "",
            `Veículo: ${r.vehicle.title ?? "—"} (${r.vehicle.plate})`,
            `Motivo: ${input.motivoRecusa.trim()}`,
            `Rental ID: ${r.id}`,
          ].join("\n"),
        }).catch(() => {
          /* não falha a recusa por e-mail */
        });
      }
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
              portas: true,
              lugares: true,
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
        financialSummary: true,
        financialEntries: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      const myReview = await prisma.rentalReview.findUnique({
        where: {
          rentalId_direction: {
            rentalId: r.id,
            direction: "OWNER_TO_DRIVER",
          },
        },
      });

      const tagsFromJson = (json: unknown): string[] => {
        if (json == null) return [];
        if (Array.isArray(json)) {
          return json.filter((x): x is string => typeof x === "string");
        }
        return [];
      };

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
        contractUrl:
          r.contractUrl ??
          (r.contractS3Key ? await presignGetRead(r.contractS3Key, 3600) : null),
        returnDate: r.returnDate,
        situation: r.situation,
        pendingReason: r.pendingReason,
        pendingResolutionExpectedAt: r.pendingResolutionExpectedAt,
        vehicle: r.vehicle,
        driver: r.driver,
        financial: {
          summary: r.financialSummary,
          entries: r.financialEntries,
          totals: financialTotals(r.financialSummary, r.financialEntries),
        },
        review: {
          canSubmit: r.status === "COMPLETED" && !myReview,
          submitted: myReview
            ? {
                stars: myReview.stars,
                tags: tagsFromJson(myReview.tagsJson),
                comment: myReview.comment,
                createdAt: myReview.createdAt,
              }
            : null,
        },
      };
    }),

  upsertRentalFinancialSummary: ownerProcedure
    .input(
      z.object({
        rentalId: z.string(),
        agreedAmountCents: z.number().int().min(0).max(100_000_000),
        securityDepositCents: z
          .number()
          .int()
          .min(0)
          .max(100_000_000)
          .optional()
          .nullable(),
        status: rentalPaymentStatusSchema.default("PENDING"),
        dueDate: z.date().optional().nullable(),
        notes: z.string().max(4000).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      await assertOwnsRental(ownerUserId, input.rentalId);
      const notes = input.notes?.trim() ? input.notes.trim() : null;
      const summary = await prisma.rentalFinancialSummary.upsert({
        where: { rentalId: input.rentalId },
        create: {
          rentalId: input.rentalId,
          agreedAmountCents: input.agreedAmountCents,
          securityDepositCents: input.securityDepositCents ?? null,
          status: input.status,
          dueDate: input.dueDate ?? null,
          notes,
        },
        update: {
          agreedAmountCents: input.agreedAmountCents,
          securityDepositCents: input.securityDepositCents ?? null,
          status: input.status,
          dueDate: input.dueDate ?? null,
          notes,
        },
      });
      return { summary };
    }),

  addRentalFinancialEntry: ownerProcedure
    .input(
      z.object({
        rentalId: z.string(),
        type: rentalFinancialEntryTypeSchema,
        amountCents: z.number().int().positive().max(100_000_000),
        method: rentalPaymentMethodSchema.optional().nullable(),
        paidAt: z.date().optional().nullable(),
        notes: z.string().max(4000).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      await assertOwnsRental(ownerUserId, input.rentalId);
      const entry = await prisma.rentalFinancialEntry.create({
        data: {
          rentalId: input.rentalId,
          type: input.type,
          amountCents: input.amountCents,
          method: input.method ?? null,
          paidAt: input.paidAt ?? null,
          notes: input.notes?.trim() ? input.notes.trim() : null,
        },
      });
      return { entry };
    }),

  deleteRentalFinancialEntry: ownerProcedure
    .input(z.object({ rentalId: z.string(), entryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      await assertOwnsRental(ownerUserId, input.rentalId);
      const entry = await prisma.rentalFinancialEntry.findFirst({
        where: { id: input.entryId, rentalId: input.rentalId },
        select: { id: true },
      });
      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lançamento financeiro não encontrado.",
        });
      }
      await prisma.rentalFinancialEntry.delete({ where: { id: input.entryId } });
      return { ok: true as const };
    }),

  setRentalPickupAndContract: ownerProcedure
    .input(
      z.object({
        rentalId: z.string(),
        pickupInstructions: z.string().min(3, {
          message:
            "Informe as instruções de retirada (mínimo 3 caracteres).",
        }),
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

      const contractText = input.contractText?.trim() || null;

      // Se o usuário já informou uma URL manual, preservamos e não geramos PDF automático.
      // Se não informou URL e existe texto, geramos PDF, fazemos upload no S3 e salvamos a key.
      let contractS3Key: string | null = null;
      if (!input.contractUrl && contractText) {
        const pdfBytes = await contractTextToPdfBytes({
          title: `Contrato de locação (Rental ${r.id})`,
          text: contractText,
        });
        contractS3Key = `rentals/${r.id}/contract.pdf`;
        await putObjectBuffer({
          key: contractS3Key,
          contentType: "application/pdf",
          body: pdfBytes,
        });
      }

      await prisma.rental.update({
        where: { id: r.id },
        data: {
          pickupInstructions: input.pickupInstructions,
          contractText: contractText ?? undefined,
          contractUrl: input.contractUrl ?? undefined,
          contractS3Key: contractS3Key ?? undefined,
          status: "ACTIVE",
          situation: "ATIVA",
        },
      });
      return {
        ok: true as const,
        contractUrl:
          (input.contractUrl ?? null) ||
          (contractS3Key ? await presignGetRead(contractS3Key, 3600) : null),
      };
    }),

  submitRentalReturn: ownerProcedure
    .input(
      z
        .object({
          rentalId: z.string(),
          returnDate: z.coerce.date(),
          situation: z.enum(["LIBERADA", "PENDENTE"]),
          pendingReason: z.string().max(2000).optional(),
          pendingResolutionExpectedAt: z.coerce.date().optional(),
        })
        .superRefine((data, ctx) => {
          if (data.situation === "PENDENTE") {
            const pr = data.pendingReason?.trim() ?? "";
            if (pr.length < 3) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Informe o motivo da pendência (mínimo 3 caracteres).",
                path: ["pendingReason"],
              });
            }
            if (!data.pendingResolutionExpectedAt) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Informe a previsão da solução.",
                path: ["pendingResolutionExpectedAt"],
              });
            }
          }
        })
    )
    .mutation(async ({ ctx, input }) => {
      const r = await prisma.rental.findFirst({
        where: {
          id: input.rentalId,
          vehicle: { ownerUserId: (ctx as AuthedContext).user.id },
          status: "ACTIVE",
        },
      });
      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Locação ativa não encontrada",
        });
      }

      const returnDate = input.returnDate;

      if (input.situation === "LIBERADA") {
        await prisma.$transaction([
          prisma.rental.update({
            where: { id: r.id },
            data: {
              status: "COMPLETED",
              situation: "LIBERADA",
              returnDate,
              pendingReason: null,
              pendingResolutionExpectedAt: null,
            },
          }),
          prisma.vehicle.update({
            where: { id: r.vehicleId },
            data: { available: true },
          }),
        ]);
        return { ok: true as const };
      }

      await prisma.rental.update({
        where: { id: r.id },
        data: {
          situation: "PENDENTE",
          returnDate,
          pendingReason: input.pendingReason!.trim(),
          pendingResolutionExpectedAt: input.pendingResolutionExpectedAt!,
        },
      });
      return { ok: true as const };
    }),
});
