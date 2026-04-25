import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthedContext } from "../context.js";
import { prisma } from "../db.js";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  type AllowedContentType,
  buildRentalInspectionPhotoKey,
  deleteObject,
  presignGetRead,
  presignPutUpload,
} from "../storage/s3.js";
import { protectedProcedure, router } from "../trpc.js";

const inspectionTypeSchema = z.enum(["CHECKOUT", "CHECKIN"]);
const fuelLevelSchema = z.enum([
  "EMPTY",
  "QUARTER",
  "HALF",
  "THREE_QUARTERS",
  "FULL",
]);
const contentTypeSchema = z.enum(
  ALLOWED_CONTENT_TYPES as unknown as [string, ...string[]]
);

const fileMeta = z.object({
  contentType: contentTypeSchema,
  fileName: z.string().min(1).max(200).optional(),
  byteSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

type InspectionType = z.infer<typeof inspectionTypeSchema>;
type InspectionPhotoRow = {
  id: string;
  inspectionId: string;
  key: string;
  contentType: string;
  byteSize: number;
  sortOrder: number;
  createdAt: Date;
};

async function getRentalForParticipant(rentalId: string, userId: string) {
  const rental = await prisma.rental.findFirst({
    where: {
      id: rentalId,
      OR: [{ driverUserId: userId }, { vehicle: { ownerUserId: userId } }],
    },
    include: {
      vehicle: {
        select: {
          id: true,
          ownerUserId: true,
          kmLivre: true,
          kmPorContrato: true,
        },
      },
    },
  });
  if (!rental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Locação não encontrada",
    });
  }
  return rental;
}

async function getRentalForOwner(rentalId: string, ownerUserId: string) {
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, vehicle: { ownerUserId } },
    include: {
      vehicle: {
        select: {
          id: true,
          ownerUserId: true,
          kmLivre: true,
          kmPorContrato: true,
        },
      },
    },
  });
  if (!rental) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Locação não encontrada para este locador",
    });
  }
  return rental;
}

function assertCanEditInspection(
  rental: Awaited<ReturnType<typeof getRentalForOwner>>,
  type: InspectionType
) {
  if (type === "CHECKOUT" && !["APPROVED", "ACTIVE"].includes(rental.status)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A vistoria de retirada só pode ser feita com locação aprovada ou ativa.",
    });
  }
  if (type === "CHECKIN" && rental.status !== "ACTIVE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A vistoria de devolução só pode ser feita com locação ativa.",
    });
  }
}

async function assertOdometerOrder(
  rentalId: string,
  type: InspectionType,
  odometerKm: number
) {
  const otherType = type === "CHECKOUT" ? "CHECKIN" : "CHECKOUT";
  const other = await prisma.rentalInspection.findUnique({
    where: { rentalId_type: { rentalId, type: otherType } },
    select: { odometerKm: true },
  });
  if (!other) return;

  const invalid =
    type === "CHECKIN"
      ? odometerKm < other.odometerKm
      : odometerKm > other.odometerKm;
  if (invalid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "O hodômetro da devolução não pode ser menor que o hodômetro da retirada.",
    });
  }
}

async function withPhotoUrls<T extends { photos: InspectionPhotoRow[] }>(
  inspection: T
): Promise<
  Omit<T, "photos"> & {
    photos: Array<InspectionPhotoRow & { photoUrl: string }>;
  }
> {
  const { photos, ...rest } = inspection;
  return {
    ...rest,
    photos: await Promise.all(
      photos.map(async (p) => ({
        ...p,
        photoUrl: await presignGetRead(p.key, 3600),
      }))
    ),
  };
}

function mileageSummary(
  inspections: Array<{ type: InspectionType; odometerKm: number }>,
  kmLivre: boolean,
  kmPorContrato: number
) {
  const checkout = inspections.find((i) => i.type === "CHECKOUT");
  const checkin = inspections.find((i) => i.type === "CHECKIN");
  if (!checkout || !checkin) return null;
  const drivenKm = checkin.odometerKm - checkout.odometerKm;
  return {
    drivenKm,
    kmLivre,
    kmPorContrato,
    exceededKm: !kmLivre && kmPorContrato > 0 ? Math.max(0, drivenKm - kmPorContrato) : 0,
  };
}

export const rentalInspectionRouter = router({
  list: protectedProcedure
    .input(z.object({ rentalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = (ctx as AuthedContext).user.id;
      const rental = await getRentalForParticipant(input.rentalId, userId);
      const inspections = await prisma.rentalInspection.findMany({
        where: { rentalId: rental.id },
        orderBy: { createdAt: "asc" },
        include: { photos: { orderBy: { sortOrder: "asc" } } },
      });
      return {
        items: await Promise.all(inspections.map((i) => withPhotoUrls(i))),
        mileage: mileageSummary(
          inspections,
          rental.vehicle.kmLivre,
          rental.vehicle.kmPorContrato
        ),
      };
    }),

  requestPhotoUploads: protectedProcedure
    .input(
      z.object({
        rentalId: z.string(),
        type: inspectionTypeSchema,
        files: z.array(fileMeta).min(1).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      const rental = await getRentalForOwner(input.rentalId, ownerUserId);
      assertCanEditInspection(rental, input.type);
      const existing = await prisma.rentalInspection.findUnique({
        where: { rentalId_type: { rentalId: input.rentalId, type: input.type } },
        select: {
          ownerAckAt: true,
          driverAckAt: true,
          _count: { select: { photos: true } },
        },
      });
      if (existing?.ownerAckAt && existing.driverAckAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vistoria já aceita por ambos e não pode mais receber fotos.",
        });
      }
      if ((existing?._count.photos ?? 0) + input.files.length > 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Máximo de 10 fotos por vistoria.",
        });
      }

      const items = await Promise.all(
        input.files.map(async (f) => {
          const key = buildRentalInspectionPhotoKey(
            input.rentalId,
            input.type,
            f.fileName
          );
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
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        rentalId: z.string(),
        type: inspectionTypeSchema,
        odometerKm: z.number().int().min(0).max(2_000_000),
        fuelLevel: fuelLevelSchema,
        notes: z.string().max(4000).optional().nullable(),
        photos: z
          .array(
            z.object({
              key: z.string().min(1),
              contentType: contentTypeSchema,
              byteSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
            })
          )
          .min(1)
          .max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      const rental = await getRentalForOwner(input.rentalId, ownerUserId);
      assertCanEditInspection(rental, input.type);
      await assertOdometerOrder(input.rentalId, input.type, input.odometerKm);

      const existing = await prisma.rentalInspection.findUnique({
        where: { rentalId_type: { rentalId: input.rentalId, type: input.type } },
        select: { id: true, ownerAckAt: true, driverAckAt: true },
      });
      if (existing?.ownerAckAt && existing.driverAckAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vistoria já aceita por ambos e não pode mais ser editada.",
        });
      }
      const expectedKeyPrefix = `rentals/${input.rentalId}/inspections/${input.type}/`;
      if (input.photos.some((photo) => !photo.key.startsWith(expectedKeyPrefix))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Foto inválida para esta vistoria.",
        });
      }

      const notes = input.notes?.trim() ? input.notes.trim() : null;
      const inspection = await prisma.$transaction(async (tx) => {
        const row = existing
          ? await tx.rentalInspection.update({
              where: { id: existing.id },
              data: {
                odometerKm: input.odometerKm,
                fuelLevel: input.fuelLevel,
                notes,
                ownerAckAt: null,
                ownerAckUserId: null,
                driverAckAt: null,
                driverAckUserId: null,
              },
            })
          : await tx.rentalInspection.create({
              data: {
                rentalId: input.rentalId,
                type: input.type,
                odometerKm: input.odometerKm,
                fuelLevel: input.fuelLevel,
                notes,
                createdByUserId: ownerUserId,
              },
            });

        await tx.rentalInspectionPhoto.deleteMany({
          where: { inspectionId: row.id },
        });
        await tx.rentalInspectionPhoto.createMany({
          data: input.photos.map((p, index) => ({
            inspectionId: row.id,
            key: p.key,
            contentType: p.contentType,
            byteSize: p.byteSize,
            sortOrder: index,
          })),
        });

        return tx.rentalInspection.findUniqueOrThrow({
          where: { id: row.id },
          include: { photos: { orderBy: { sortOrder: "asc" } } },
        });
      });

      return { inspection: await withPhotoUrls(inspection) };
    }),

  deletePhoto: protectedProcedure
    .input(z.object({ rentalId: z.string(), photoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ownerUserId = (ctx as AuthedContext).user.id;
      const photo = await prisma.rentalInspectionPhoto.findFirst({
        where: {
          id: input.photoId,
          inspection: {
            rentalId: input.rentalId,
            rental: { vehicle: { ownerUserId } },
          },
        },
        include: {
          inspection: {
            include: {
              rental: {
                include: {
                  vehicle: {
                    select: {
                      id: true,
                      ownerUserId: true,
                      kmLivre: true,
                      kmPorContrato: true,
                    },
                  },
                },
              },
              _count: { select: { photos: true } },
            },
          },
        },
      });
      if (!photo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Foto da vistoria não encontrada",
        });
      }
      assertCanEditInspection(photo.inspection.rental, photo.inspection.type);
      if (photo.inspection.ownerAckAt && photo.inspection.driverAckAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vistoria já aceita por ambos e não pode mais ser editada.",
        });
      }
      if (photo.inspection._count.photos <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A vistoria precisa manter pelo menos 1 foto.",
        });
      }

      await deleteObject(photo.key);
      await prisma.rentalInspectionPhoto.delete({ where: { id: photo.id } });
      return { ok: true as const };
    }),

  ack: protectedProcedure
    .input(z.object({ rentalId: z.string(), type: inspectionTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx as AuthedContext).user.id;
      const rental = await getRentalForParticipant(input.rentalId, userId);
      const inspection = await prisma.rentalInspection.findUnique({
        where: { rentalId_type: { rentalId: input.rentalId, type: input.type } },
      });
      if (!inspection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vistoria não encontrada",
        });
      }

      const now = new Date();
      const isOwner = rental.vehicle.ownerUserId === userId;
      const isDriver = rental.driverUserId === userId;
      await prisma.rentalInspection.update({
        where: { id: inspection.id },
        data: isOwner
          ? { ownerAckAt: now, ownerAckUserId: userId }
          : isDriver
            ? { driverAckAt: now, driverAckUserId: userId }
            : {},
      });
      return { ok: true as const };
    }),
});
