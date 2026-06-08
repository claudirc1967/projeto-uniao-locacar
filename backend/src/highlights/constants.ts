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

const TIER_LABELS_PT: Record<VehicleHighlightTier, string> = {
  NORMAL: "Padrão",
  BRONZE: "Bronze",
  PRATA: "Prata",
  OURO: "Ouro",
};

export function highlightTierLabelPt(tier: VehicleHighlightTier): string {
  return TIER_LABELS_PT[tier];
}

/** Antecedência (dias) do lembrete de expiração enviado ao locador. */
export const HIGHLIGHT_EXPIRY_REMINDER_DAYS = 3;
