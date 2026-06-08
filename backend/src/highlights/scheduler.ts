import { runHighlightExpirationSweep } from "./expiration.js";

const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

function runOnce(): void {
  runHighlightExpirationSweep()
    .then((r) => {
      if (r.expiredOrders || r.downgradedVehicles || r.remindersSent) {
        // eslint-disable-next-line no-console
        console.log(
          `[highlights:sweep] expirados=${r.expiredOrders} rebaixados=${r.downgradedVehicles} lembretes=${r.remindersSent}`
        );
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[highlights:sweep:error]", err);
    });
}

/**
 * Agenda a rotina de expiração de destaques (fase 5).
 * Roda uma vez na inicialização e depois periodicamente.
 * Desative com HIGHLIGHT_SWEEP_DISABLED=1.
 */
export function startHighlightExpirationScheduler(): NodeJS.Timeout | null {
  if (process.env.HIGHLIGHT_SWEEP_DISABLED === "1") {
    return null;
  }
  runOnce();
  const timer = setInterval(runOnce, SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
