/** Idempotência para ads.track (único por evento no cliente). */
export function createAdEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
