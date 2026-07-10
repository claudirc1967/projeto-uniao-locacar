/** Lista canônica de cores do veículo (rótulo gravado em `Vehicle.cor`). */
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

export const VEHICLE_COLOR_LABELS: readonly string[] = VEHICLE_COLORS.map(
  (c) => c.label
);

const LABEL_SET = new Set(VEHICLE_COLOR_LABELS);

/** Aceita vazio; se informado, deve ser um rótulo canônico exato. */
export function parseOptionalVehicleColor(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const t = value.trim();
  if (!t) return null;
  if (!LABEL_SET.has(t)) {
    throw new Error(
      `Cor inválida. Use uma das cores canônicas: ${VEHICLE_COLOR_LABELS.join(", ")}.`
    );
  }
  return t;
}
