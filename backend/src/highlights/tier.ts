import type { VehicleHighlightTier } from "@prisma/client";
import {
  groupVehiclesByTier,
  sortVehiclesWithinTier,
} from "./exposure.js";

const TIER_WEIGHT: Record<VehicleHighlightTier, number> = {
  OURO: 4,
  PRATA: 3,
  BRONZE: 2,
  NORMAL: 1,
};

export function effectiveHighlightTier(
  vehicle: {
    highlightTier: VehicleHighlightTier;
    highlightExpiresAt: Date | null;
  },
  now = new Date()
): VehicleHighlightTier {
  if (vehicle.highlightTier === "NORMAL") {
    return "NORMAL";
  }
  if (vehicle.highlightExpiresAt && vehicle.highlightExpiresAt <= now) {
    return "NORMAL";
  }
  return vehicle.highlightTier;
}

export function tierSortWeight(
  vehicle: {
    highlightTier: VehicleHighlightTier;
    highlightExpiresAt: Date | null;
  },
  now = new Date()
): number {
  return TIER_WEIGHT[effectiveHighlightTier(vehicle, now)];
}

export type MarketplaceSortOptions = {
  now?: Date;
  exposureCounts?: ReadonlyMap<string, number>;
  rotationSeed?: number;
};

/**
 * Ordenação marketplace: blocos por tier (OURO → NORMAL),
 * rodízio justo dentro de cada tier por exposições 24h.
 */
export function sortVehiclesForMarketplace<
  T extends {
    id: string;
    highlightTier: VehicleHighlightTier;
    highlightExpiresAt: Date | null;
    updatedAt: Date;
  },
>(vehicles: T[], options: MarketplaceSortOptions = {}): T[] {
  const now = options.now ?? new Date();
  const exposureCounts = options.exposureCounts ?? new Map<string, number>();
  const rotationSeed = options.rotationSeed ?? 0;

  const groups = groupVehiclesByTier(vehicles, (v) =>
    effectiveHighlightTier(v, now)
  );

  const result: T[] = [];
  for (const tier of ["OURO", "PRATA", "BRONZE", "NORMAL"] as const) {
    const tierVehicles = groups.get(tier) ?? [];
    if (tierVehicles.length === 0) continue;

    const sorted = sortVehiclesWithinTier(
      tierVehicles,
      exposureCounts,
      rotationSeed
    );
    result.push(...sorted);
  }

  return result;
}
