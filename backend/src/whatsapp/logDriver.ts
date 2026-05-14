import { providerTemplateName } from "./config.js";
import { maskPhoneForLog } from "./phone.js";
import type { SendWhatsAppInput } from "./types.js";

export async function sendWhatsAppViaLog(
  input: SendWhatsAppInput & { toE164: string }
): Promise<void> {
  const providerTemplate = providerTemplateName(input.templateId);

  // eslint-disable-next-line no-console
  console.info("[WHATSAPP:log]", {
    to: maskPhoneForLog(input.toE164),
    templateId: input.templateId,
    providerTemplate: providerTemplate ?? null,
    variables: input.variables,
    body: input.body,
  });
}
