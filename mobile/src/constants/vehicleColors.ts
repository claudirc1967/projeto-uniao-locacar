/** Lista canônica de cores do veículo (código + rótulo gravado em `Vehicle.cor`). */
export const VEHICLE_COLORS = [
  { code: "BRANCO", label: "Branco" },
  { code: "PRETO", label: "Preto" },
  { code: "PRATA", label: "Prata" },
  { code: "CINZA", label: "Cinza" },
  { code: "GRAFITE", label: "Grafite" },
  { code: "AZUL", label: "Azul" },
  { code: "VERMELHO", label: "Vermelho" },
  { code: "VERDE", label: "Verde" },
  { code: "AMARELO", label: "Amarelo" },
  { code: "LARANJA", label: "Laranja" },
  { code: "MARROM", label: "Marrom" },
  { code: "BEGE", label: "Bege" },
  { code: "DOURADO", label: "Dourado" },
  { code: "BRONZE", label: "Bronze" },
  { code: "ROXO", label: "Roxo" },
  { code: "ROSA", label: "Rosa" },
  { code: "TURQUESA", label: "Turquesa" },
  { code: "BORDO", label: "Bordô" },
  { code: "CHAMPAGNE", label: "Champagne" },
  { code: "OUTRA", label: "Outra" },
] as const;

export type VehicleColorCode = (typeof VEHICLE_COLORS)[number]["code"];
export type VehicleColorLabel = (typeof VEHICLE_COLORS)[number]["label"];

export const VEHICLE_COLOR_LABELS: readonly string[] = VEHICLE_COLORS.map(
  (c) => c.label
);

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Resolve texto livre / código para o rótulo canônico, se existir. */
export function resolveVehicleColorLabel(
  raw: string | null | undefined
): VehicleColorLabel | null {
  const t = raw?.trim();
  if (!t) return null;
  const f = fold(t);
  const found = VEHICLE_COLORS.find(
    (c) => fold(c.label) === f || fold(c.code) === f
  );
  return found?.label ?? null;
}

export function isVehicleColorLabel(value: string): boolean {
  return resolveVehicleColorLabel(value) != null;
}

export function vehicleColorDisplayLabel(
  stored: string | null | undefined
): string {
  if (!stored?.trim()) return "Selecionar cor";
  return resolveVehicleColorLabel(stored) ?? stored.trim();
}
