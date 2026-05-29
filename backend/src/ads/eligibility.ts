import type {
  AdCampaign,
  AdPlacementKey,
  Role,
} from "@prisma/client";
import {
  IMPRESSION_LOOKBACK_MS,
  MAX_IMPRESSIONS_PER_USER_PER_DAY,
} from "./constants.js";

export function normalizeUf(uf?: string | null): string | null {
  const t = uf?.trim().toUpperCase();
  return t || null;
}

export function normalizeCidade(cidade?: string | null): string | null {
  const t = cidade?.trim().toLowerCase();
  return t || null;
}

export function isCampaignWithinSchedule(
  campaign: Pick<AdCampaign, "startsAt" | "endsAt">,
  now: Date = new Date()
): boolean {
  if (campaign.startsAt && campaign.startsAt > now) return false;
  if (campaign.endsAt && campaign.endsAt < now) return false;
  return true;
}

export function campaignMatchesPlacement(
  campaign: Pick<AdCampaign, "placements">,
  placement: AdPlacementKey
): boolean {
  return campaign.placements.includes(placement);
}

export function campaignMatchesRole(
  campaign: Pick<AdCampaign, "targetRoles">,
  role: Role
): boolean {
  if (campaign.targetRoles.length === 0) return true;
  return campaign.targetRoles.includes(role);
}

export function campaignMatchesGeo(
  campaign: Pick<AdCampaign, "nationwide" | "targetUfs" | "targetCidades">,
  uf?: string | null,
  cidade?: string | null
): boolean {
  if (campaign.nationwide) return true;

  const u = normalizeUf(uf);
  const c = normalizeCidade(cidade);
  const ufs = campaign.targetUfs.map((x) => x.trim().toUpperCase()).filter(Boolean);
  const cidades = campaign.targetCidades
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  if (ufs.length === 0 && cidades.length === 0) return true;

  if (ufs.length > 0) {
    if (!u || !ufs.includes(u)) return false;
  }

  if (cidades.length > 0) {
    if (!c || !cidades.includes(c)) return false;
  }

  return true;
}

export function filterEligibleCampaigns(
  campaigns: AdCampaign[],
  input: {
    placement: AdPlacementKey;
    role: Role;
    uf?: string | null;
    cidade?: string | null;
    now?: Date;
  }
): AdCampaign[] {
  const now = input.now ?? new Date();
  return campaigns
    .filter((c) => c.status === "ACTIVE")
    .filter((c) => isCampaignWithinSchedule(c, now))
    .filter((c) => campaignMatchesPlacement(c, input.placement))
    .filter((c) => campaignMatchesRole(c, input.role))
    .filter((c) => campaignMatchesGeo(c, input.uf, input.cidade));
}

export function filterByImpressionCap(
  campaigns: AdCampaign[],
  impressionCounts: ReadonlyMap<string, number>,
  placement: AdPlacementKey,
  maxPerDay: number = MAX_IMPRESSIONS_PER_USER_PER_DAY
): AdCampaign[] {
  return campaigns.filter((c) => {
    const key = impressionCountKey(c.id, placement);
    return (impressionCounts.get(key) ?? 0) < maxPerDay;
  });
}

/** Chave de contagem: campanha + placement (cap independente por slot). */
export function impressionCountKey(
  campaignId: string,
  placement: AdPlacementKey
): string {
  return `${campaignId}:${placement}`;
}

/**
 * Round-robin justo: soma impressões do tier no placement e avança o índice.
 * rotationSeed desloca slots simultâneos (ex.: vários AdSlots no marketplace).
 */
export function pickRoundRobinFromTier(
  tier: AdCampaign[],
  impressionCounts: ReadonlyMap<string, number>,
  placement: AdPlacementKey,
  rotationSeed: number = 0
): AdCampaign | null {
  if (tier.length === 0) return null;
  const sorted = [...tier].sort((a, b) => a.id.localeCompare(b.id));
  const totalImpressions = sorted.reduce(
    (sum, c) =>
      sum + (impressionCounts.get(impressionCountKey(c.id, placement)) ?? 0),
    0
  );
  const index = (totalImpressions + rotationSeed) % sorted.length;
  return sorted[index] ?? null;
}

export function pickEligibleCampaign(
  campaigns: AdCampaign[],
  input: {
    placement: AdPlacementKey;
    role: Role;
    uf?: string | null;
    cidade?: string | null;
    userId: string;
    rotationSeed?: number;
    impressionCounts?: ReadonlyMap<string, number>;
    now?: Date;
  }
): AdCampaign | null {
  const now = input.now ?? new Date();
  const eligible = filterEligibleCampaigns(campaigns, { ...input, now });
  if (eligible.length === 0) return null;

  const counts = input.impressionCounts ?? new Map<string, number>();
  const afterCap = filterByImpressionCap(eligible, counts, input.placement);
  if (afterCap.length === 0) return null;

  const maxPriority = Math.max(...afterCap.map((c) => c.priority));
  const tier = afterCap.filter((c) => c.priority === maxPriority);

  return pickRoundRobinFromTier(
    tier,
    counts,
    input.placement,
    input.rotationSeed ?? 0
  );
}

export function impressionLookbackStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - IMPRESSION_LOOKBACK_MS);
}
