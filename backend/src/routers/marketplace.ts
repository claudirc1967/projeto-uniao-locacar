import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthedContext } from "../context.js";
import { isDriverBlockedFromVehicleRequest } from "../driverVehicleBlock.js";
import { prisma } from "../db.js";
import { presignGetRead } from "../storage/s3.js";
import { protectedProcedure, router } from "../trpc.js";

export const marketplaceRouter = router({
  listAvailableVehicles: protectedProcedure.query(async ({ ctx }) => {
    const list = await prisma.vehicle.findMany({
      where: { available: true },
      orderBy: { updatedAt: "desc" },
      include: {
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
        owner: { select: { id: true, email: true } },
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
            contractTime: v.contractTime,
            dailyRateCents: v.dailyRateCents,
            pickupCity: v.pickupCity,
            pickupUf: v.pickupUf,
            ownerEmail: v.owner.email,
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
        include: { photos: { orderBy: { sortOrder: "asc" } } },
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
          contractTime: v.contractTime,
          dailyRateCents: v.dailyRateCents,
          requirementsJson: v.requirementsJson,
          paymentNotes: v.paymentNotes,
          pickupCity: v.pickupCity,
          pickupUf: v.pickupUf,
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
