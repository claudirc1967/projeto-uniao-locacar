export type AdPlacementKey = "DRIVER_HOME" | "MARKETPLACE_LIST";

export const AD_PLACEMENTS = {
  DRIVER_HOME: "DRIVER_HOME",
  MARKETPLACE_LIST: "MARKETPLACE_LIST",
} as const satisfies Record<string, AdPlacementKey>;

/** Intervalo fixo de veículos na lista antes de exibir house ad (marketplace). */
export const MARKETPLACE_AD_EVERY_N = 4;
