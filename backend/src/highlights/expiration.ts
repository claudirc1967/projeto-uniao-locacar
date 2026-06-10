import { prisma } from "../db.js";
import { sendEmail } from "../email/consoleEmail.js";
import { highlightExpiringEmail } from "../email/templates.js";
import {
  highlightExpiringWhatsApp,
  sendWhatsApp,
} from "../whatsapp/sendWhatsApp.js";
import {
  HIGHLIGHT_EXPIRY_REMINDER_DAYS,
  highlightTierLabelPt,
} from "./constants.js";

export type ExpirationSweepResult = {
  expiredOrders: number;
  downgradedVehicles: number;
  remindersSent: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fim da janela de lembrete (now + N dias). */
export function reminderWindowEnd(
  now: Date,
  days: number = HIGHLIGHT_EXPIRY_REMINDER_DAYS
): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

/** Dias inteiros restantes até a expiração (mínimo 0). */
export function daysUntil(expiresAt: Date, now: Date): number {
  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
}

/**
 * Rotina de expiração de destaques (fase 5):
 * 1. Marca pedidos ACTIVE vencidos como EXPIRED (dirigido por order.endsAt).
 * 2. Rebaixa veículos cujo destaque venceu para NORMAL e limpa a data
 *    (dirigido por Vehicle.highlightExpiresAt — não pelo pedido, para não
 *    atropelar renovações).
 * 3. Envia lembrete ao locador para destaques que vencem em breve.
 */
export async function runHighlightExpirationSweep(
  now: Date = new Date()
): Promise<ExpirationSweepResult> {
  const expired = await prisma.vehicleHighlightOrder.updateMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    data: { status: "EXPIRED" },
  });

  const downgraded = await prisma.vehicle.updateMany({
    where: {
      highlightTier: { not: "NORMAL" },
      highlightExpiresAt: { lte: now },
    },
    data: { highlightTier: "NORMAL", highlightExpiresAt: null },
  });

  const windowEnd = reminderWindowEnd(now);
  const soonToExpire = await prisma.vehicleHighlightOrder.findMany({
    where: {
      status: "ACTIVE",
      expiryReminderSentAt: null,
      endsAt: { gt: now, lte: windowEnd },
    },
    include: {
      vehicle: {
        select: {
          brand: true,
          model: true,
          year: true,
          plate: true,
          cor: true,
        },
      },
      owner: {
        select: {
          email: true,
          ownerProfile: {
            select: { nomeRazaoSocial: true, emailLocador: true, phone: true },
          },
        },
      },
    },
  });

  let remindersSent = 0;
  for (const order of soonToExpire) {
    if (!order.endsAt) continue;
    const tierLabel = highlightTierLabelPt(order.tier);
    const daysLeft = daysUntil(order.endsAt, now);
    const ownerName = order.owner.ownerProfile?.nomeRazaoSocial;

    const to =
      order.owner.ownerProfile?.emailLocador?.trim() || order.owner.email.trim();
    if (to) {
      const email = highlightExpiringEmail({
        owner: { name: ownerName },
        vehicle: order.vehicle,
        tierLabel,
        expiresAt: order.endsAt,
        daysLeft,
      });
      try {
        await sendEmail({ to, ...email });
      } catch {
        /* não falha a rotina por erro de e-mail */
      }
    }

    const ownerPhone = order.owner.ownerProfile?.phone?.trim();
    if (ownerPhone) {
      const whatsapp = highlightExpiringWhatsApp({
        owner: { name: ownerName },
        vehicle: order.vehicle,
        tierLabel,
        expiresAt: order.endsAt,
        daysLeft,
      });
      void sendWhatsApp({ to: ownerPhone, ...whatsapp }).catch(() => {
        /* não falha a rotina por erro de WhatsApp */
      });
    }

    await prisma.vehicleHighlightOrder.update({
      where: { id: order.id },
      data: { expiryReminderSentAt: now },
    });
    remindersSent++;
  }

  return {
    expiredOrders: expired.count,
    downgradedVehicles: downgraded.count,
    remindersSent,
  };
}
