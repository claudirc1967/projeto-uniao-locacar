import { Pressable, StyleSheet, View } from "react-native";
import { Icon, Text } from "react-native-paper";

const ACCENT = "#f97316";

type Props = {
  onPress: () => void;
  /** Quando true, texto indica destaque já ativo (sem CTA de compra). */
  activeTierLabel?: string | null;
  /** Pedido aguardando confirmação PIX. */
  pendingLabel?: string | null;
};

export function HighlightPromoBanner({
  onPress,
  activeTierLabel,
  pendingLabel,
}: Props) {
  if (pendingLabel) {
    return (
      <Pressable onPress={onPress} style={styles.wrap}>
        <View style={styles.textBlock}>
          <Text variant="titleSmall" style={styles.headline}>
            Pagamento em análise
          </Text>
          <Text variant="bodySmall" style={styles.sub}>
            {pendingLabel}
          </Text>
        </View>
        <View style={styles.btnOutline}>
          <Icon source="clock-outline" size={16} color={ACCENT} />
          <Text style={styles.btnLabel}>Ver pedido</Text>
        </View>
      </Pressable>
    );
  }

  if (activeTierLabel) {
    return (
      <View style={styles.wrap}>
        <View style={styles.textBlock}>
          <Text variant="titleSmall" style={styles.headline}>
            Destaque ativo
          </Text>
          <Text variant="bodySmall" style={styles.sub}>
            {activeTierLabel}
          </Text>
        </View>
        <Pressable onPress={onPress} style={styles.btnOutline}>
          <Icon source="lightning-bolt" size={16} color={ACCENT} />
          <Text style={styles.btnLabel}>Renovar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.textBlock}>
        <Text variant="titleSmall" style={styles.headline}>
          Volte ao topo da lista
        </Text>
        <Text variant="bodySmall" style={styles.sub}>
          Mais visibilidade para o seu anúncio.
        </Text>
      </View>
      <Pressable onPress={onPress} style={styles.btnOutline}>
        <Icon source="lightning-bolt" size={16} color={ACCENT} />
        <Text style={styles.btnLabel}>Destacar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  textBlock: { flex: 1, gap: 2 },
  headline: { color: "#374151", fontWeight: "600" },
  sub: { color: "#6b7280" },
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  btnLabel: { color: ACCENT, fontWeight: "600", fontSize: 14 },
});
