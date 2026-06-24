/** Contato público de suporte (login / telas pré-auth). */
export type PublicSupportConfig = {
  supportEmail: string | null;
  /** Apenas dígitos, com DDI (ex.: 5531995477155). */
  supportWhatsApp: string | null;
  whatsAppUrl: string | null;
};

function normalizeEmail(raw: string | undefined): string | null {
  const email = raw?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function normalizeWhatsApp(raw: string | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function getPublicSupportConfig(): PublicSupportConfig {
  const supportEmail = normalizeEmail(process.env.ADMIN_SUPPORT_EMAIL);
  const supportWhatsApp = normalizeWhatsApp(process.env.ADMIN_SUPPORT_WHATSAPP);
  return {
    supportEmail,
    supportWhatsApp,
    whatsAppUrl: supportWhatsApp ? `https://wa.me/${supportWhatsApp}` : null,
  };
}
