import type { VehicleHighlightTier } from "@prisma/client";
import { prisma } from "../db.js";

/** Janela de lookback para rodízio justo e métricas (24h). */
export const EXPOSURE_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export function exposureLookbackStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - EXPOSURE_LOOKBACK_MS);
}

export async function loadVehicleExposureCounts(
  vehicleIds: string[],
  since: Date = exposureLookbackStart()
): Promise<Map<string, number>> {
  if (vehicleIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.marketplaceExposureEvent.groupBy({
    by: ["vehicleId"],
    where: {
      vehicleId: { in: vehicleIds },
      placement: "LIST",
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.vehicleId, row._count._all);
  }
  return counts;
}

const TIER_SORT_ORDER: VehicleHighlightTier[] = [
  "OURO",
  "PRATA",
  "BRONZE",
  "NORMAL",
];

/**
 * Ordena veículos dentro de um tier: menor exposição primeiro;
 * desempate com id estável + rotationSeed (padrão ads).
 */
export function sortVehiclesWithinTier<
  T extends { id: string },
>(
  vehicles: T[],
  exposureCounts: ReadonlyMap<string, number>,
  rotationSeed: number = 0
): T[] {
  if (vehicles.length <= 1) {
    return [...vehicles];
  }

  const byId = [...vehicles].sort((a, b) => a.id.localeCompare(b.id));
  const indexById = new Map(byId.map((v, i) => [v.id, i]));
  const totalImpressions = byId.reduce(
    (sum, v) => sum + (exposureCounts.get(v.id) ?? 0),
    0
  );
  const n = byId.length;

  return [...vehicles].sort((a, b) => {
    const countA = exposureCounts.get(a.id) ?? 0;
    const countB = exposureCounts.get(b.id) ?? 0;
    if (countA !== countB) {
      return countA - countB;
    }

    const indexA = indexById.get(a.id) ?? 0;
    const indexB = indexById.get(b.id) ?? 0;
    const rankA = (indexA + totalImpressions + rotationSeed) % n;
    const rankB = (indexB + totalImpressions + rotationSeed) % n;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.id.localeCompare(b.id);
  });
}

export function groupVehiclesByTier<
  T extends {
    id: string;
    highlightTier: VehicleHighlightTier;
    highlightExpiresAt: Date | null;
  },
>(
  vehicles: T[],
  getTier: (v: T) => VehicleHighlightTier
): Map<VehicleHighlightTier, T[]> {
  const groups = new Map<VehicleHighlightTier, T[]>();
  for (const tier of TIER_SORT_ORDER) {
    groups.set(tier, []);
  }
  for (const v of vehicles) {
    const tier = getTier(v);
    groups.get(tier)?.push(v);
  }
  return groups;
}
