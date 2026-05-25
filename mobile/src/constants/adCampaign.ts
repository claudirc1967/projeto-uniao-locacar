import type { AdPlacementKey } from "../constants/adPlacements";
import { formatDateForm, parseDdMmYyyy } from "../utils/masks";

export type AdCampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED";
export type AdTargetRole = "OWNER" | "DRIVER";

export const AD_CAMPAIGN_STATUSES: AdCampaignStatus[] = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
];

export const AD_TARGET_ROLES: AdTargetRole[] = ["DRIVER", "OWNER"];

export const AD_PLACEMENT_OPTIONS: AdPlacementKey[] = [
  "DRIVER_HOME",
  "MARKETPLACE_LIST",
];

export function adCampaignStatusLabel(status: AdCampaignStatus): string {
  switch (status) {
    case "DRAFT":
      return "Rascunho";
    case "ACTIVE":
      return "Ativa";
    case "PAUSED":
      return "Pausada";
  }
}

export function adPlacementLabel(placement: AdPlacementKey): string {
  switch (placement) {
    case "DRIVER_HOME":
      return "Início do motorista";
    case "MARKETPLACE_LIST":
      return "Lista do marketplace";
  }
}

export function adTargetRoleLabel(role: AdTargetRole): string {
  switch (role) {
    case "DRIVER":
      return "Motorista";
    case "OWNER":
      return "Locador";
  }
}

export function parseCommaList(value: string): string[] {
  return value
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseOptionalDate(value: string): Date | null {
  const t = value.trim();
  if (!t) return null;
  return parseDdMmYyyy(t);
}

export function formatDateInput(value: Date | string | null | undefined): string {
  return formatDateForm(value);
}
