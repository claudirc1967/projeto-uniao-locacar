import { Platform } from "react-native";

/** Base da API (sem `/trpc`), ex.: `https://api.uniaolocacar.com.br`. */
export function getApiBaseUrl(): string {
  return getTrpcUrl().replace(/\/trpc\/?$/, "");
}

/** URL completa do endpoint tRPC (inclui `/trpc`). */
export function getTrpcUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_TRPC_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000/trpc";
  }
  return "http://localhost:4000/trpc";
}

/**
 * Túneis ngrok (plano free) devolvem página HTML de aviso para clientes que não
 * enviam este header; o fetch do React Native falha com "Network request failed".
 * @see https://ngrok.com/docs/guides/device-gateway/linux
 */
export function getTrpcNgrokHeaders(): Record<string, string> {
  if (getTrpcUrl().includes("ngrok")) {
    return { "ngrok-skip-browser-warning": "true" };
  }
  return {};
}
