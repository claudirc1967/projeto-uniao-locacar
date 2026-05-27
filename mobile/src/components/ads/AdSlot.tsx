import { Platform } from "react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import type { AdPlacementKey } from "../../constants/adPlacements";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { HouseAdCard, type HouseAdVariant } from "./HouseAdCard";

const DECISION_STALE_MS = 5 * 60 * 1000;

function adPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

type Props = {
  placement: AdPlacementKey;
  /** compact: faixa na home; default: card na lista do marketplace */
  variant?: HouseAdVariant;
};

/**
 * Reserva espaço na tela e exibe house ad conforme ads.decision no servidor.
 * Fase 1: só motorista; AdMob fica para fase 3.
 */
export function AdSlot({ placement, variant = "default" }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const platform = adPlatform();
  const compact = variant === "compact";

  const decisionQ = trpc.ads.decision.useQuery(
    { placement, platform },
    {
      enabled: user?.role === "DRIVER",
      staleTime: DECISION_STALE_MS,
      retry: false,
    }
  );

  if (user?.role !== "DRIVER") {
    return null;
  }

  if (decisionQ.isLoading) {
    if (compact) return null;
    return (
      <View style={styles.slot}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (decisionQ.isError || !decisionQ.data) {
    return null;
  }

  if (decisionQ.data.kind === "house" && decisionQ.data.house) {
    return (
      <View style={[styles.slot, compact ? styles.slotCompact : null]}>
        <HouseAdCard
          placement={placement}
          platform={platform}
          house={decisionQ.data.house}
          variant={variant}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  slot: {
    width: "100%",
    marginTop: 12,
    marginBottom: 4,
    ...Platform.select({
      web: {
        position: "relative",
        zIndex: 0,
      },
      default: {},
    }),
  },
  slotCompact: {
    marginTop: 4,
    marginBottom: 8,
  },
  loading: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
