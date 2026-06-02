export type VehicleType = "CAR" | "MOTORCYCLE";

export const VEHICLE_TYPE_OPTIONS: ReadonlyArray<{
  value: VehicleType;
  label: string;
}> = [
  { value: "CAR", label: "Automóvel" },
  { value: "MOTORCYCLE", label: "Motocicleta" },
];

export function vehicleTypeLabel(type: VehicleType | null | undefined): string {
  if (type === "MOTORCYCLE") return "Motocicleta";
  return "Automóvel";
}
