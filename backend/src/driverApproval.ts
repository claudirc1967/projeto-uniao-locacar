import { prisma } from "./db.js";
import { notifyAdminWhatsAppRelay } from "./email/adminNotify.js";
import { sendEmail } from "./email/consoleEmail.js";
import { driverApprovedEmail } from "./email/templates.js";
import {
  driverApprovedWhatsApp,
  sendWhatsApp,
} from "./whatsapp/sendWhatsApp.js";

/**
 * Marca o cadastro como revisado (APPROVED) e dispara as mesmas notificações
 * do botão admin "Marcar como revisado" (e-mail, WhatsApp e relay admin).
 */
export async function markDriverAsReviewed(input: {
  driverUserId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null | undefined;
}): Promise<void> {
  await prisma.driverProfile.update({
    where: { userId: input.driverUserId },
    data: { status: "APPROVED", rejectionReason: null },
  });

  const to = input.email?.trim();
  if (to) {
    const email = driverApprovedEmail({
      driver: { name: input.fullName },
    });
    void sendEmail({ to, ...email }).catch(() => {
      /* não falha a aprovação por e-mail */
    });
  }

  const driverApprovedMessage = driverApprovedWhatsApp({
    driver: { name: input.fullName },
  });
  if (input.phone) {
    void sendWhatsApp({ to: input.phone, ...driverApprovedMessage }).catch(
      () => {
        /* não falha a aprovação por WhatsApp */
      }
    );
  }

  void notifyAdminWhatsAppRelay({
    event: "Cadastro de motorista aprovado",
    recipientName: input.fullName,
    recipientPhone: input.phone,
    message: driverApprovedMessage,
  }).catch(() => {
    /* não falha a aprovação por aviso admin */
  });
}
