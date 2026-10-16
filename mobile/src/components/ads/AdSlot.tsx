import { Platform } from "react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { AD_PLACEMENTS, type AdPlacementKey } from "../../constants/adPlacements";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { useAdVisitorId } from "../../utils/adVisitorId";
import { HouseAdCard, type HouseAdVariant } from "./HouseAdCard";

const DECISION_STALE_MS = 30 * 1000;

function adPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

type Props = {
  placement: AdPlacementKey;
  /** compact: faixa na home; default: card horizontal na lista do marketplace */
  variant?: HouseAdVariant;
  /** Diferencia slots no mesmo placement (rodízio no marketplace). */
  rotationSeed?: number;
  /** Filtro da lista. Sem filtro, o servidor usa a cidade do perfil de quem está logado. */
  uf?: string;
  cidade?: string;
};

/**
 * Reserva espaço na tela e exibe house ad conforme ads.decision no servidor.
 * A lista do marketplace vale para qualquer visitante. A home continua só para motorista.
 */
export function AdSlot({
  placement,
  variant = "default",
  rotationSeed,
  uf,
  cidade,
}: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const platform = adPlatform();
  const compact = variant === "compact";
  const publicList = placement === AD_PLACEMENTS.MARKETPLACE_LIST;
  const enabled = publicList || user?.role === "DRIVER";
  const visitorId = useAdVisitorId(enabled && !user);
  const ufTrim = uf?.trim();
  const cidadeTrim = cidade?.trim();

  const decisionQ = trpc.ads.decision.useQuery(
    {
      placement,
      platform,
      rotationSeed: rotationSeed ?? 0,
      ...(ufTrim ? { uf: ufTrim } : {}),
      ...(cidadeTrim ? { cidade: cidadeTrim } : {}),
      ...(visitorId ? { visitorId } : {}),
    },
    {
      enabled: enabled && (!!user || !!visitorId),
      staleTime: DECISION_STALE_MS,
      refetchOnMount: "always",
      retry: false,
    }
  );

  const waitingVisitor = enabled && !user && !visitorId;

  if (!enabled) {
    return null;
  }

  if (waitingVisitor || decisionQ.isLoading) {
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
          visitorId={visitorId ?? undefined}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  slot: {
    width: "100%",
    // Espaçamento alinhado ao marginBottom dos cards de veículo (12).
    marginTop: 0,
    marginBottom: 12,
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
