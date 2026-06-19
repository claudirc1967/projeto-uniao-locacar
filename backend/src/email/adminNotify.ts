import type { WhatsAppMessage } from "../whatsapp/types.js";
import { normalizePhoneToE164 } from "../whatsapp/phone.js";
import { sendEmail } from "./consoleEmail.js";

function valueOrDash(value: string | null | undefined): string {
  const text = value?.trim();
  return text ? text : "—";
}

export function getAdminNotifyEmail(): string | undefined {
  const email = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  return email || undefined;
}

function formatPhoneForAdmin(value: string | null | undefined): string {
  const e164 = normalizePhoneToE164(value);
  if (e164) return e164;
  const raw = value?.trim();
  if (raw) return `${raw} (formato inválido — confira no app)`;
  return "— (não cadastrado)";
}

export function adminWhatsAppRelayEmail(input: {
  event: string;
  recipientName: string | null | undefined;
  recipientPhone: string | null | undefined;
  message: WhatsAppMessage;
}): { subject: string; text: string } {
  const phoneLine = formatPhoneForAdmin(input.recipientPhone);

  return {
    subject: `[União Locacar] WhatsApp manual: ${input.event}`,
    text: [
      "Aviso operacional — encaminhar manualmente no WhatsApp",
      "",
      `Evento: ${input.event}`,
      "",
      "Destinatário WhatsApp:",
      `  Nome: ${valueOrDash(input.recipientName)}`,
      `  Telefone: ${phoneLine}`,
      "",
      "Mensagem sugerida (copie o bloco abaixo e cole no WhatsApp):",
      "────────────────────────────────",
      input.message.body,
      "────────────────────────────────",
      "",
      "O usuário também recebe e-mail transacional, se tiver e-mail cadastrado.",
      "Este aviso é interno — não responda a este e-mail.",
    ].join("\n"),
  };
}

/** Fire-and-forget: avisa o admin para repassar a mensagem no WhatsApp. */
export async function notifyAdminWhatsAppRelay(input: {
  event: string;
  recipientName: string | null | undefined;
  recipientPhone: string | null | undefined;
  message: WhatsAppMessage;
}): Promise<void> {
  const admin = getAdminNotifyEmail();
  if (!admin) return;

  const email = adminWhatsAppRelayEmail(input);
  await sendEmail({ to: admin, ...email });
}
