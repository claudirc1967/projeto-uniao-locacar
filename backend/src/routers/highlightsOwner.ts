import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthedContext } from "../context.js";
import { isPaidHighlightTier, PAID_HIGHLIGHT_TIERS } from "../highlights/constants.js";
import {
  buildHighlightPixQrPayload,
  generateHighlightOrderReference,
} from "../highlights/pix.js";
import { serializePlan } from "../highlights/orders.js";
import { effectiveHighlightTier } from "../highlights/tier.js";
import { prisma } from "../db.js";
import { ownerProcedure, protectedProcedure, router } from "../trpc.js";

const paidTierSchema = z.enum(["BRONZE", "PRATA", "OURO"]);

async function assertOwnsVehicle(ownerUserId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerUserId },
    select: { id: true, title: true, plate: true },
  });
  if (!vehicle) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Veículo não encontrado.",
    });
  }
  return vehicle;
}

function serializeOrderPayment(
  order: {
    id: string;
    orderReference: string;
    status: string;
    tier: string;
    amountCents: number;
    durationDaysSnapshot: number;
    createdAt: Date;
    endsAt: Date | null;
  },
  pix: { pixKey: string; receiverName: string; pixKeyType: string }
) {
  return {
    orderId: order.id,
    orderReference: order.orderReference,
    status: order.status,
    tier: order.tier,
    amountCents: order.amountCents,
    durationDaysSnapshot: order.durationDaysSnapshot,
    createdAt: order.createdAt,
    endsAt: order.endsAt,
    pixKey: pix.pixKey,
    pixKeyType: pix.pixKeyType,
    receiverName: pix.receiverName,
    qrPayload: buildHighlightPixQrPayload(pix.pixKey),
  };
}

export const highlightsOwnerRouter = router({
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    const user = (ctx as AuthedContext).user;
    if (user.role !== "OWNER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas proprietários",
      });
    }

    const plans = await prisma.highlightPlan.findMany({
      where: {
        tier: { in: [...PAID_HIGHLIGHT_TIERS] },
        active: true,
        priceCents: { gt: 0 },
      },
      orderBy: { tier: "asc" },
    });
    return plans.map(serializePlan);
  }),

  listMyOrders: ownerProcedure
    .input(
      z
        .object({
          vehicleId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx as AuthedContext;
      const orders = await prisma.vehicleHighlightOrder.findMany({
        where: {
          ownerUserId: user.id,
          ...(input?.vehicleId ? { vehicleId: input.vehicleId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          vehicle: { select: { id: true, title: true, plate: true } },
        },
      });
      return orders.map((o) => ({
        id: o.id,
        orderReference: o.orderReference,
        status: o.status,
        tier: o.tier,
        amountCents: o.amountCents,
        durationDaysSnapshot: o.durationDaysSnapshot,
        createdAt: o.createdAt,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        vehicle: o.vehicle,
      }));
    }),

  getPendingOrderForVehicle: ownerProcedure
    .input(z.object({ vehicleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx as AuthedContext;
      await assertOwnsVehicle(user.id, input.vehicleId);

      const pixConfig = await prisma.highlightPlatformConfig.findUnique({
        where: { id: "default" },
      });

      const order = await prisma.vehicleHighlightOrder.findFirst({
        where: {
          vehicleId: input.vehicleId,
          ownerUserId: user.id,
          status: "PENDING_PIX",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!order || !pixConfig?.pixKey) {
        return { pending: null };
      }

      return {
        pending: serializeOrderPayment(order, pixConfig),
      };
    }),

  createOrder: ownerProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        tier: paidTierSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx as AuthedContext;
      await assertOwnsVehicle(user.id, input.vehicleId);

      if (!isPaidHighlightTier(input.tier)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tier inválido para contratação.",
        });
      }

      const [plan, pixConfig] = await Promise.all([
        prisma.highlightPlan.findUnique({ where: { tier: input.tier } }),
        prisma.highlightPlatformConfig.findUnique({ where: { id: "default" } }),
      ]);

      if (!plan?.active || plan.priceCents <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este plano de destaque não está disponível no momento.",
        });
      }

      if (!pixConfig?.pixKey?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Pagamento PIX ainda não configurado pela plataforma. Tente mais tarde.",
        });
      }

      const existingPending = await prisma.vehicleHighlightOrder.findFirst({
        where: {
          vehicleId: input.vehicleId,
          ownerUserId: user.id,
          status: "PENDING_PIX",
        },
      });

      if (existingPending && existingPending.tier === input.tier) {
        return serializeOrderPayment(existingPending, pixConfig);
      }

      if (existingPending) {
        await prisma.vehicleHighlightOrder.update({
          where: { id: existingPending.id },
          data: { status: "CANCELLED" },
        });
      }

      let orderReference = generateHighlightOrderReference();
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const order = await prisma.vehicleHighlightOrder.create({
            data: {
              vehicleId: input.vehicleId,
              ownerUserId: user.id,
              tier: input.tier,
              status: "PENDING_PIX",
              amountCents: plan.priceCents,
              durationDaysSnapshot: plan.durationDays,
              orderReference,
            },
          });
          return serializeOrderPayment(order, pixConfig);
        } catch (e) {
          const isUnique =
            e &&
            typeof e === "object" &&
            "code" in e &&
            (e as { code: string }).code === "P2002";
          if (!isUnique) throw e;
          orderReference = generateHighlightOrderReference();
        }
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível criar o pedido. Tente novamente.",
      });
    }),
});
