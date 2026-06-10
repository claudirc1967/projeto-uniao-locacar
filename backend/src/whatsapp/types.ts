export const WHATSAPP_TEMPLATE_IDS = [
  "rental_requested",
  "driver_approved",
  "driver_rejected",
  "rental_approved",
  "rental_rejected",
  "highlight_expiring",
] as const;

export type WhatsAppTemplateId = (typeof WHATSAPP_TEMPLATE_IDS)[number];

export type WhatsAppMessage = {
  templateId: WhatsAppTemplateId;
  variables: string[];
  body: string;
};

export type SendWhatsAppInput = {
  to: string;
} & WhatsAppMessage;
