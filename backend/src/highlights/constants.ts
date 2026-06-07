import type { VehicleHighlightTier } from "@prisma/client";

export const PAID_HIGHLIGHT_TIERS = [
  "BRONZE",
  "PRATA",
  "OURO",
] as const satisfies readonly VehicleHighlightTier[];

export type PaidHighlightTier = (typeof PAID_HIGHLIGHT_TIERS)[number];

export function isPaidHighlightTier(
  tier: VehicleHighlightTier
): tier is PaidHighlightTier {
  return (PAID_HIGHLIGHT_TIERS as readonly VehicleHighlightTier[]).includes(
    tier
  );
}
