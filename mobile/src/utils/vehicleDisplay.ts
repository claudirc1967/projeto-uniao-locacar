import type { VehicleType } from "../constants/vehicleType";
import { vehicleTypeLabel } from "../constants/vehicleType";

/** Linha de capacidade (portas/lugares) — omitir para moto. */
export function formatVehicleCapacityLine(
  vehicleType: VehicleType | null | undefined,
  portas: number | null | undefined,
  lugares: number | null | undefined
): string | null {
  if (vehicleType === "MOTORCYCLE") return null;
  const parts: string[] = [];
  if (portas != null) parts.push(`Portas: ${portas}`);
  if (lugares != null) parts.push(`Lugares: ${lugares}`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

/** Tipo + capacidade para listagens (ex.: marketplace). */
export function formatVehicleMetaLine(
  vehicleType: VehicleType | null | undefined,
  portas: number | null | undefined,
  lugares: number | null | undefined
): string {
  const typeLabel = vehicleTypeLabel(vehicleType ?? "CAR");
  const capacity = formatVehicleCapacityLine(vehicleType, portas, lugares);
  return capacity ? `${typeLabel} · ${capacity}` : typeLabel;
}
