export type AdPlacementKey = "DRIVER_HOME" | "MARKETPLACE_LIST";

export const AD_PLACEMENTS = {
  DRIVER_HOME: "DRIVER_HOME",
  MARKETPLACE_LIST: "MARKETPLACE_LIST",
} as const satisfies Record<string, AdPlacementKey>;
