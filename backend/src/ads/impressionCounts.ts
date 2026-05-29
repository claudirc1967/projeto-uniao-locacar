import type { AdPlacementKey } from "@prisma/client";
import { prisma } from "../db.js";
import { impressionCountKey, impressionLookbackStart } from "./eligibility.js";

export async function loadUserImpressionCounts(
  userId: string,
  since: Date = impressionLookbackStart()
): Promise<Map<string, number>> {
  const rows = await prisma.adEvent.groupBy({
    by: ["campaignId", "placement"],
    where: {
      userId,
      eventType: "IMPRESSION",
      createdAt: { gte: since },
      campaignId: { not: null },
    },
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.campaignId) continue;
    const key = impressionCountKey(row.campaignId, row.placement as AdPlacementKey);
    counts.set(key, row._count._all);
  }
  return counts;
}
