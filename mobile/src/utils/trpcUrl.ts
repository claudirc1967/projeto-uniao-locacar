import { Platform } from "react-native";

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
