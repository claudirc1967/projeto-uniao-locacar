import type { VehicleHighlightTier } from "@prisma/client";

export function computeHighlightEndsAt(
  startsAt: Date,
  durationDays: number
): Date {
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + durationDays);
  endsAt.setHours(23, 59, 59, 999);
  return endsAt;
}

export function serializePlan(plan: {
  tier: VehicleHighlightTier;
  priceCents: number;
  durationDays: number;
  active: boolean;
  description: string | null;
}) {
  return {
    tier: plan.tier,
    priceCents: plan.priceCents,
    durationDays: plan.durationDays,
    active: plan.active,
    description: plan.description,
    purchasable: plan.active && plan.priceCents > 0,
  };
}
