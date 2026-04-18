import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { ReviewDirection } from "@prisma/client";
import { z } from "zod";
import type { AuthedContext } from "../context.js";
import { prisma } from "../db.js";
import { protectedProcedure, router } from "../trpc.js";

const POSITIVE_TAGS = new Set([
  "Pontual",
  "Comunicação boa",
  "Veículo em bom estado",
]);
const NEGATIVE_TAGS = new Set([
  "Atraso",
  "Comunicação ruim",
  "Problema no veículo",
]);

function validateTagsForStars(stars: number, tags: string[] | undefined) {
  if (!tags?.length) return;
  const allowed = stars >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;
  for (const t of tags) {
    if (!allowed.has(t)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Opção inválida para esta nota: ${t}`,
      });
    }
  }
}

async function bumpRatingAggregate(
  tx: Prisma.TransactionClient,
  toUserId: string,
  stars: number
) {
  const user = await tx.user.findUnique({
    where: { id: toUserId },
    include: { ownerProfile: true, driverProfile: true },
  });
  if (!user) return;
  if (user.role === "OWNER" && user.ownerProfile) {
    const n = user.ownerProfile.ratingCount;
    const avg = user.ownerProfile.averageRating;
    const newN = n + 1;
    const newAvg = n === 0 ? stars : (avg * n + stars) / newN;
    await tx.ownerProfile.update({
      where: { userId: toUserId },
      data: { averageRating: newAvg, ratingCount: newN },
    });
  } else if (user.role === "DRIVER" && user.driverProfile) {
    const n = user.driverProfile.ratingCount;
    const avg = user.driverProfile.averageRating;
    const newN = n + 1;
    const newAvg = n === 0 ? stars : (avg * n + stars) / newN;
    await tx.driverProfile.update({
      where: { userId: toUserId },
      data: { averageRating: newAvg, ratingCount: newN },
    });
  }
}

export const rentalReviewRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        rentalId: z.string(),
        stars: z.number().int().min(1).max(5),
        tags: z.array(z.string()).max(8).optional(),
        comment: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const me = (ctx as AuthedContext).user;
      const rental = await prisma.rental.findUnique({
        where: { id: input.rentalId },
        include: { vehicle: true },
      });
      if (!rental) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Locação não encontrada.",
        });
      }
      if (rental.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível avaliar locações concluídas.",
        });
      }

      let direction: ReviewDirection;
      let toUserId: string;
      if (me.role === "OWNER") {
        if (rental.vehicle.ownerUserId !== me.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não participa desta locação como locador.",
          });
        }
        direction = ReviewDirection.OWNER_TO_DRIVER;
        toUserId = rental.driverUserId;
      } else {
        if (rental.driverUserId !== me.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não participa desta locação como locatário.",
          });
        }
        direction = ReviewDirection.DRIVER_TO_OWNER;
        toUserId = rental.vehicle.ownerUserId;
      }

      validateTagsForStars(input.stars, input.tags);

      const existing = await prisma.rentalReview.findUnique({
        where: {
          rentalId_direction: { rentalId: input.rentalId, direction },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Você já avaliou esta locação.",
        });
      }

      const tags = input.tags?.length ? input.tags : undefined;

      await prisma.$transaction(async (tx) => {
        await tx.rentalReview.create({
          data: {
            rentalId: input.rentalId,
            fromUserId: me.id,
            toUserId,
            direction,
            stars: input.stars,
            tagsJson: tags ?? undefined,
            comment: input.comment?.trim() ? input.comment.trim() : null,
          },
        });
        await bumpRatingAggregate(tx, toUserId, input.stars);
      });

      return { ok: true as const };
    }),
});
