export type VehicleHighlightTier = "NORMAL" | "BRONZE" | "PRATA" | "OURO";

export const HIGHLIGHT_TIER_OPTIONS: VehicleHighlightTier[] = [
  "NORMAL",
  "BRONZE",
  "PRATA",
  "OURO",
];

const LABELS: Record<VehicleHighlightTier, string> = {
  NORMAL: "Padrão",
  BRONZE: "Bronze",
  PRATA: "Prata",
  OURO: "Ouro",
};

export function highlightTierLabel(tier: VehicleHighlightTier): string {
  return LABELS[tier];
}

export function effectiveHighlightTier(
  vehicle: {
    highlightTier: VehicleHighlightTier;
    highlightExpiresAt: Date | string | null;
  },
  now = new Date()
): VehicleHighlightTier {
  if (vehicle.highlightTier === "NORMAL") return "NORMAL";
  if (vehicle.highlightExpiresAt) {
    const exp = new Date(vehicle.highlightExpiresAt);
    if (exp <= now) return "NORMAL";
  }
  return vehicle.highlightTier;
}

export const PAID_HIGHLIGHT_TIERS: VehicleHighlightTier[] = [
  "BRONZE",
  "PRATA",
  "OURO",
];

/** Cores para badge de destaque no marketplace (ícones Paper). */
export const HIGHLIGHT_TIER_COLORS: Record<
  Exclude<VehicleHighlightTier, "NORMAL">,
  string
> = {
  BRONZE: "#CD7F32",
  PRATA: "#9CA3AF",
  OURO: "#D4AF37",
};

export function isPaidHighlightTier(
  tier: VehicleHighlightTier
): tier is Exclude<VehicleHighlightTier, "NORMAL"> {
  return tier !== "NORMAL";
}
