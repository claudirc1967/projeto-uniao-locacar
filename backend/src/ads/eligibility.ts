import type {
  AdCampaign,
  AdPlacementKey,
  Role,
} from "@prisma/client";

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

export function pickEligibleCampaign(
  campaigns: AdCampaign[],
  input: {
    placement: AdPlacementKey;
    role: Role;
    uf?: string | null;
    cidade?: string | null;
    now?: Date;
  }
): AdCampaign | null {
  const now = input.now ?? new Date();
  const eligible = campaigns
    .filter((c) => c.status === "ACTIVE")
    .filter((c) => isCampaignWithinSchedule(c, now))
    .filter((c) => campaignMatchesPlacement(c, input.placement))
    .filter((c) => campaignMatchesRole(c, input.role))
    .filter((c) => campaignMatchesGeo(c, input.uf, input.cidade))
    .sort((a, b) => b.priority - a.priority);

  return eligible[0] ?? null;
}
