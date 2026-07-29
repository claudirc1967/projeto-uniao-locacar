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

function formatBrlFromCents(amountCents: number): string {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

export function highlightOrderRequestedAdminEmail(input: {
  ownerName: string | null | undefined;
  ownerEmail: string | null | undefined;
  ownerPhone: string | null | undefined;
  vehicleTitle: string | null | undefined;
  vehiclePlate: string | null | undefined;
  tierLabel: string;
  amountCents: number;
  durationDays: number;
  orderReference: string;
}): { subject: string; text: string } {
  const vehicleLine = [
    valueOrDash(input.vehicleTitle),
    input.vehiclePlate?.trim() ? `(${input.vehiclePlate.trim()})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    subject: `[União Locacar] Nova solicitação de destaque: ${input.tierLabel}`,
    text: [
      "Aviso operacional — nova solicitação de destaque (PIX pendente)",
      "",
      "Confirme o pagamento em Admin → Destaques após identificar o PIX.",
      "",
      "Pedido:",
      `  Referência: ${input.orderReference}`,
      `  Plano: ${input.tierLabel}`,
      `  Valor: ${formatBrlFromCents(input.amountCents)}`,
      `  Duração: ${input.durationDays} dia(s)`,
      `  Veículo: ${vehicleLine}`,
      "",
      "Locador:",
      `  Nome: ${valueOrDash(input.ownerName)}`,
      `  E-mail: ${valueOrDash(input.ownerEmail)}`,
      `  Telefone: ${formatPhoneForAdmin(input.ownerPhone)}`,
      "",
      "Este aviso é interno — não responda a este e-mail.",
    ].join("\n"),
  };
}

/** Fire-and-forget: avisa o admin sobre pedido de destaque aguardando PIX. */
export async function notifyAdminHighlightOrderRequested(input: {
  ownerName: string | null | undefined;
  ownerEmail: string | null | undefined;
  ownerPhone: string | null | undefined;
  vehicleTitle: string | null | undefined;
  vehiclePlate: string | null | undefined;
  tierLabel: string;
  amountCents: number;
  durationDays: number;
  orderReference: string;
}): Promise<void> {
  const admin = getAdminNotifyEmail();
  if (!admin) return;

  const email = highlightOrderRequestedAdminEmail(input);
  await sendEmail({ to: admin, ...email });
}
