import { MD3LightTheme, type MD3Theme } from "react-native-paper";

/** Tema MD3 com identidade mais “clean” (azul + neutros frios). */
export const appPaperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2563eb",
    onPrimary: "#ffffff",
    primaryContainer: "#dbeafe",
    onPrimaryContainer: "#1e3a8a",
    secondary: "#475569",
    onSecondary: "#ffffff",
    secondaryContainer: "#f1f5f9",
    onSecondaryContainer: "#0f172a",
    surface: "#ffffff",
    surfaceVariant: "#f1f5f9",
    onSurface: "#0f172a",
    onSurfaceVariant: "#64748b",
    outline: "#cbd5e1",
    error: "#dc2626",
    onError: "#ffffff",
    background: "#f8fafc",
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: "transparent",
      level1: "#ffffff",
      level2: "#ffffff",
      level3: "#ffffff",
      level4: "#ffffff",
      level5: "#ffffff",
    },
  },
};
