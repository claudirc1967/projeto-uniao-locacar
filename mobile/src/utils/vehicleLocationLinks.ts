import { Linking, Platform } from "react-native";

export type VehiclePickupFields = {
  pickupCep?: string | null;
  pickupLogradouro?: string | null;
  pickupNumero?: string | null;
  pickupComplemento?: string | null;
  pickupBairro?: string | null;
  pickupCity?: string | null;
  pickupUf?: string | null;
};

/** Texto para busca em mapas; null se não houver dados suficientes. */
export function buildVehiclePickupSearchQuery(
  v: VehiclePickupFields
): string | null {
  const cepDigits = (v.pickupCep ?? "").replace(/\D/g, "");
  const parts = [
    v.pickupLogradouro,
    v.pickupNumero,
    v.pickupComplemento,
    v.pickupBairro,
    v.pickupCity,
    v.pickupUf,
    cepDigits.length >= 8 ? cepDigits : null,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function wazeSearchUrl(query: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(query)}`;
}

/** Abre URL externa (nova aba no web). */
export function openExternalUrl(url: string): void {
  if (Platform.OS === "web") {
    globalThis.open?.(url, "_blank", "noopener,noreferrer");
    return;
  }
  void Linking.openURL(url);
}
