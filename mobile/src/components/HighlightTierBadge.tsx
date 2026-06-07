import { StyleSheet, View } from "react-native";
import { Icon, Text } from "react-native-paper";
import {
  HIGHLIGHT_TIER_COLORS,
  highlightTierLabel,
  isPaidHighlightTier,
  type VehicleHighlightTier,
} from "../constants/highlightTier";

type Props = {
  tier: VehicleHighlightTier;
  compact?: boolean;
};

export function HighlightTierBadge({ tier, compact }: Props) {
  if (!isPaidHighlightTier(tier)) {
    return null;
  }

  const color = HIGHLIGHT_TIER_COLORS[tier];
  const label = highlightTierLabel(tier);

  return (
    <View
      style={[styles.wrap, compact && styles.wrapCompact]}
      accessibilityRole="text"
      accessibilityLabel={`Destaque ${label}`}
    >
      <Icon source="medal" size={compact ? 14 : 16} color={color} />
      {!compact ? (
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  wrapCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});
