import { isWhatsAppEnabled, whatsAppDriver } from "./config.js";
import { sendWhatsAppViaHttp } from "./httpDriver.js";
import { sendWhatsAppViaLog } from "./logDriver.js";
import { normalizePhoneToE164 } from "./phone.js";
import type { SendWhatsAppInput } from "./types.js";

export type { SendWhatsAppInput, WhatsAppMessage, WhatsAppTemplateId } from "./types.js";
export {
  driverApprovedWhatsApp,
  driverRejectedWhatsApp,
  highlightExpiringWhatsApp,
  rentalApprovedWhatsApp,
  rentalRejectedWhatsApp,
  rentalRequestedWhatsApp,
} from "./templates.js";

export async function sendWhatsApp(input: SendWhatsAppInput): Promise<void> {
  if (!isWhatsAppEnabled()) {
    return;
  }

  const toE164 = normalizePhoneToE164(input.to);
  if (!toE164) {
    return;
  }

  const payload = { ...input, toE164 };

  if (whatsAppDriver() === "http") {
    await sendWhatsAppViaHttp(payload);
    return;
  }

  await sendWhatsAppViaLog(payload);
}
