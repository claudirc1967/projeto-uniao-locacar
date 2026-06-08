import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthedContext } from "../context.js";
import {
  HIGHLIGHT_EXPIRY_REMINDER_DAYS,
  PAID_HIGHLIGHT_TIERS,
} from "../highlights/constants.js";
import {
  reminderWindowEnd,
  runHighlightExpirationSweep,
} from "../highlights/expiration.js";
import { computeHighlightEndsAt, serializePlan } from "../highlights/orders.js";
import { effectiveHighlightTier } from "../highlights/tier.js";
import { prisma } from "../db.js";
import { adminProcedure, router } from "../trpc.js";

const paidTierSchema = z.enum(["BRONZE", "PRATA", "OURO"]);
const pixKeyTypeSchema = z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"]);

const planBodySchema = z.object({
  tier: paidTierSchema,
  priceCents: z.number().int().min(0).max(10_000_000),
  durationDays: z.number().int().min(1).max(365),
  active: z.boolean(),
  description: z.string().trim().max(240).nullable().optional(),
});

const pixConfigSchema = z.object({
  pixKey: z.string().trim().min(1).max(120),
  pixKeyType: pixKeyTypeSchema,
  receiverName: z.string().trim().min(1).max(120),
});

export const highlightsAdminRouter = router({
  getPlans: adminProcedure.query(async () => {
    const plans = await prisma.highlightPlan.findMany({
      where: { tier: { in: [...PAID_HIGHLIGHT_TIERS] } },
      orderBy: { tier: "asc" },
    });
    return plans.map(serializePlan);
  }),

  upsertPlan: adminProcedure
    .input(planBodySchema)
    .mutation(async ({ input }) => {
      const plan = await prisma.highlightPlan.upsert({
        where: { tier: input.tier },
        create: {
          tier: input.tier,
          priceCents: input.priceCents,
          durationDays: input.durationDays,
          active: input.active,
          description: input.description?.trim() || null,
        },
        update: {
          priceCents: input.priceCents,
          durationDays: input.durationDays,
          active: input.active,
          description: input.description?.trim() || null,
        },
      });
      return serializePlan(plan);
    }),

  getPixConfig: adminProcedure.query(async () => {
    const config = await prisma.highlightPlatformConfig.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
    return {
      pixKey: config.pixKey,
      pixKeyType: config.pixKeyType,
      receiverName: config.receiverName,
      updatedAt: config.updatedAt,
    };
  }),

  upsertPixConfig: adminProcedure
    .input(pixConfigSchema)
    .mutation(async ({ input }) => {
      const config = await prisma.highlightPlatformConfig.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          pixKey: input.pixKey,
          pixKeyType: input.pixKeyType,
          receiverName: input.receiverName,
        },
        update: {
          pixKey: input.pixKey,
          pixKeyType: input.pixKeyType,
          receiverName: input.receiverName,
        },
      });
      return {
        pixKey: config.pixKey,
        pixKeyType: config.pixKeyType,
        receiverName: config.receiverName,
        updatedAt: config.updatedAt,
      };
    }),

  listOrders: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "PENDING_PIX",
              "ACTIVE",
              "REJECTED",
              "CANCELLED",
              "EXPIRED",
            ])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const status = input?.status ?? "PENDING_PIX";
      const orders = await prisma.vehicleHighlightOrder.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          vehicle: { select: { id: true, title: true, plate: true } },
          owner: {
            select: {
              email: true,
              ownerProfile: { select: { nomeRazaoSocial: true } },
            },
          },
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
        vehicle: o.vehicle,
        ownerEmail: o.owner.email,
        ownerName: o.owner.ownerProfile?.nomeRazaoSocial ?? null,
      }));
    }),

  confirmPayment: adminProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const admin = (ctx as AuthedContext).user;
      const order = await prisma.vehicleHighlightOrder.findUnique({
        where: { id: input.orderId },
      });
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pedido não encontrado.",
        });
      }
      if (order.status !== "PENDING_PIX") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível confirmar pedidos aguardando PIX.",
        });
      }

      const startsAt = new Date();
      const endsAt = computeHighlightEndsAt(
        startsAt,
        order.durationDaysSnapshot
      );

      await prisma.$transaction([
        prisma.vehicleHighlightOrder.update({
          where: { id: order.id },
          data: {
            status: "ACTIVE",
            paidAt: startsAt,
            confirmedByUserId: admin.id,
            startsAt,
            endsAt,
          },
        }),
        prisma.vehicle.update({
          where: { id: order.vehicleId },
          data: {
            highlightTier: order.tier,
            highlightExpiresAt: endsAt,
          },
        }),
        prisma.vehicleHighlightOrder.updateMany({
          where: {
            vehicleId: order.vehicleId,
            status: "PENDING_PIX",
            id: { not: order.id },
          },
          data: { status: "CANCELLED" },
        }),
      ]);

      return { ok: true as const };
    }),

  rejectPayment: adminProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      const order = await prisma.vehicleHighlightOrder.findUnique({
        where: { id: input.orderId },
      });
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pedido não encontrado.",
        });
      }
      if (order.status !== "PENDING_PIX") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível rejeitar pedidos aguardando PIX.",
        });
      }

      await prisma.vehicleHighlightOrder.update({
        where: { id: order.id },
        data: { status: "REJECTED" },
      });

      return { ok: true as const };
    }),

  getReport: adminProcedure.query(async () => {
    const now = new Date();
    const windowEnd = reminderWindowEnd(now);

    const [activeByTier, expiringSoon, ordersByStatus, paidAgg] =
      await Promise.all([
        prisma.vehicle.groupBy({
          by: ["highlightTier"],
          where: {
            highlightTier: { not: "NORMAL" },
            highlightExpiresAt: { gt: now },
          },
          _count: { _all: true },
        }),
        prisma.vehicleHighlightOrder.count({
          where: {
            status: "ACTIVE",
            endsAt: { gt: now, lte: windowEnd },
          },
        }),
        prisma.vehicleHighlightOrder.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.vehicleHighlightOrder.aggregate({
          where: { paidAt: { not: null } },
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
      ]);

    const activeCountByTier: Record<string, number> = {
      BRONZE: 0,
      PRATA: 0,
      OURO: 0,
    };
    for (const row of activeByTier) {
      activeCountByTier[row.highlightTier] = row._count._all;
    }

    const ordersCountByStatus: Record<string, number> = {};
    for (const row of ordersByStatus) {
      ordersCountByStatus[row.status] = row._count._all;
    }

    return {
      reminderWindowDays: HIGHLIGHT_EXPIRY_REMINDER_DAYS,
      activeCountByTier,
      activeTotal:
        activeCountByTier.BRONZE +
        activeCountByTier.PRATA +
        activeCountByTier.OURO,
      expiringSoon,
      pendingCount: ordersCountByStatus.PENDING_PIX ?? 0,
      ordersCountByStatus,
      paidOrdersCount: paidAgg._count._all,
      paidRevenueCents: paidAgg._sum.amountCents ?? 0,
    };
  }),

  runExpirationSweep: adminProcedure.mutation(async () => {
    return runHighlightExpirationSweep();
  }),

  /** Cortesia operacional — não exposto na UI principal. */
  setVehicleTier: adminProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        highlightTier: z.enum(["NORMAL", "BRONZE", "PRATA", "OURO"]),
        highlightExpiresAt: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: input.vehicleId },
        select: { id: true },
      });
      if (!vehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não encontrado.",
        });
      }

      const highlightExpiresAt =
        input.highlightTier === "NORMAL"
          ? null
          : input.highlightExpiresAt ?? null;

      const updated = await prisma.vehicle.update({
        where: { id: input.vehicleId },
        data: {
          highlightTier: input.highlightTier,
          highlightExpiresAt,
        },
        select: {
          id: true,
          highlightTier: true,
          highlightExpiresAt: true,
        },
      });

      return {
        ...updated,
        effectiveHighlightTier: effectiveHighlightTier(updated),
      };
    }),
});
