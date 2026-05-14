import { providerTemplateName } from "./config.js";
import type { SendWhatsAppInput } from "./types.js";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `WhatsApp HTTP não configurado. Defina ${name} no ambiente do backend.`
    );
  }
  return value;
}

export async function sendWhatsAppViaHttp(
  input: SendWhatsAppInput & { toE164: string }
): Promise<void> {
  const apiUrl = requiredEnv("WHATSAPP_API_URL");
  const apiToken = requiredEnv("WHATSAPP_API_TOKEN");
  const fromNumber = requiredEnv("WHATSAPP_FROM_NUMBER");
  const providerTemplate = providerTemplateName(input.templateId);
  if (!providerTemplate) {
    throw new Error(
      `Template WhatsApp não configurado para o evento ${input.templateId}.`
    );
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromNumber,
      to: input.toE164,
      template: providerTemplate,
      variables: input.variables,
      body: input.body,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Falha ao enviar WhatsApp (${response.status})${
        errorBody ? `: ${errorBody}` : ""
      }`
    );
  }
}
