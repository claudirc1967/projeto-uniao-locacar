import { TRPCError } from "@trpc/server";
import { prisma } from "./db.js";
import { notifyAdminWhatsAppRelay } from "./email/adminNotify.js";
import { sendEmail } from "./email/consoleEmail.js";
import { rentalCancelledEmail } from "./email/templates.js";
import {
  rentalCancelledWhatsApp,
  sendWhatsApp,
} from "./whatsapp/sendWhatsApp.js";

type CancelRentalOwnerNotify = {
  name: string | null | undefined;
  phone: string | null | undefined;
  email: string | null | undefined;
};

type CancelApprovedRentalInput = {
  rentalId: string;
  motivo: string;
  cancelledByAdmin: boolean;
  /** Quando informado, exige que o veículo pertença a este locador. */
  ownerUserId?: string;
  ownerForNotify: CancelRentalOwnerNotify;
};

/**
 * Cancela locação aprovada (antes da ativação/retirada): status CANCELLED,
 * libera o veículo no marketplace e notifica o motorista.
 */
export async function cancelApprovedRental(
  input: CancelApprovedRentalInput
): Promise<{ ok: true }> {
  const motivo = input.motivo.trim();

  const r = await prisma.rental.findFirst({
    where: {
      id: input.rentalId,
      status: "APPROVED",
      ...(input.ownerUserId
        ? { vehicle: { ownerUserId: input.ownerUserId } }
        : {}),
    },
    include: {
      driver: { select: { email: true, driverProfile: true } },
      vehicle: {
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          plate: true,
          cor: true,
        },
      },
    },
  });

  if (!r) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Locação aprovada não encontrada ou já não pode ser cancelada.",
    });
  }

  await prisma.$transaction([
    prisma.rental.update({
      where: { id: r.id },
      data: {
        status: "CANCELLED",
        motivoRecusa: motivo,
        rejectedByAdmin: false,
      },
    }),
    prisma.vehicle.update({
      where: { id: r.vehicleId },
      data: { available: true },
    }),
  ]);

  const ownerForTemplates = {
    name: input.ownerForNotify.name,
    phone: input.ownerForNotify.phone,
    email: input.ownerForNotify.email,
  };

  const to = r.driver.email?.trim();
  if (to) {
    const email = rentalCancelledEmail({
      driver: { name: r.driver.driverProfile?.fullName },
      owner: ownerForTemplates,
      vehicle: r.vehicle,
      cancellationReason: motivo,
      cancelledByAdmin: input.cancelledByAdmin,
    });
    void sendEmail({ to, ...email }).catch(() => {
      /* não falha o cancelamento por e-mail */
    });
  }

  const driverPhone = r.driver.driverProfile?.phone;
  const rentalCancelledMessage = rentalCancelledWhatsApp({
    driver: { name: r.driver.driverProfile?.fullName },
    owner: ownerForTemplates,
    vehicle: r.vehicle,
    cancellationReason: motivo,
    cancelledByAdmin: input.cancelledByAdmin,
  });

  if (driverPhone) {
    void sendWhatsApp({ to: driverPhone, ...rentalCancelledMessage }).catch(
      () => {
        /* não falha o cancelamento por WhatsApp */
      }
    );
  }

  void notifyAdminWhatsAppRelay({
    event: input.cancelledByAdmin
      ? "Locação aprovada cancelada (admin)"
      : "Locação aprovada cancelada (locador)",
    recipientName: r.driver.driverProfile?.fullName,
    recipientPhone: driverPhone,
    message: rentalCancelledMessage,
  }).catch(() => {
    /* não falha o cancelamento por aviso admin */
  });

  return { ok: true as const };
}
