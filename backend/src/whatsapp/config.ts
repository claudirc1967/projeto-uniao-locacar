import type { WhatsAppTemplateId } from "./types.js";

const TEMPLATE_ENV_KEYS: Record<WhatsAppTemplateId, string> = {
  rental_requested: "WHATSAPP_TEMPLATE_RENTAL_REQUESTED",
  owner_welcome: "WHATSAPP_TEMPLATE_OWNER_WELCOME",
  driver_approved: "WHATSAPP_TEMPLATE_DRIVER_APPROVED",
  driver_rejected: "WHATSAPP_TEMPLATE_DRIVER_REJECTED",
  rental_approved: "WHATSAPP_TEMPLATE_RENTAL_APPROVED",
  rental_rejected: "WHATSAPP_TEMPLATE_RENTAL_REJECTED",
  highlight_expiring: "WHATSAPP_TEMPLATE_HIGHLIGHT_EXPIRING",
};

export function isWhatsAppEnabled(): boolean {
  const value = process.env.WHATSAPP_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function whatsAppDriver(): "log" | "http" {
  const value = process.env.WHATSAPP_DRIVER?.trim().toLowerCase();
  return value === "http" ? "http" : "log";
}

export function providerTemplateName(
  templateId: WhatsAppTemplateId
): string | undefined {
  const configured = process.env[TEMPLATE_ENV_KEYS[templateId]]?.trim();
  return configured || undefined;
}
