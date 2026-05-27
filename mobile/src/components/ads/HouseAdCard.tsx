import { useEffect, useRef } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Text, useTheme } from "react-native-paper";
import type { AdPlacementKey } from "../../constants/adPlacements";
import { trpc } from "../../api/trpc";
import { createAdEventId } from "../../utils/adEventId";

export type HouseAdPayload = {
  campaignId: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  clickUrl: string;
};

export type HouseAdVariant = "default" | "compact";

type Props = {
  placement: AdPlacementKey;
  platform: "ios" | "android" | "web";
  house: HouseAdPayload;
  variant?: HouseAdVariant;
};

export function HouseAdCard({
  placement,
  platform,
  house,
  variant = "default",
}: Props) {
  const theme = useTheme();
  const impressionSent = useRef(false);
  const track = trpc.ads.track.useMutation();
  const compact = variant === "compact";

  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    track.mutate({
      eventId: createAdEventId(),
      placement,
      eventType: "IMPRESSION",
      campaignId: house.campaignId,
      platform,
    });
  }, [house.campaignId, placement, platform]);

  const onPress = () => {
    track.mutate({
      eventId: createAdEventId(),
      placement,
      eventType: "CLICK",
      campaignId: house.campaignId,
      platform,
    });
    const url = house.clickUrl.trim();
    if (url) void Linking.openURL(url);
  };

  if (compact) {
    return (
      <Card
        mode="outlined"
        style={[
          styles.compactCard,
          {
            borderColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.secondaryContainer,
          },
        ]}
      >
        <Pressable onPress={onPress} accessibilityRole="button">
          <Card.Content style={styles.compactContent}>
            <Chip
              compact
              mode="flat"
              style={[
                styles.partnerChip,
                { backgroundColor: theme.colors.surface },
              ]}
              textStyle={styles.partnerChipText}
            >
              Parceria
            </Chip>
            <View style={styles.compactRow}>
              {house.imageUrl ? (
                <Image
                  source={{ uri: house.imageUrl }}
                  style={styles.compactImage}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <View style={styles.compactTextWrap}>
                <Text variant="titleSmall" numberOfLines={1} style={styles.compactTitle}>
                  {house.title}
                </Text>
                {house.subtitle ? (
                  <Text
                    variant="bodySmall"
                    numberOfLines={2}
                    style={{ color: theme.colors.onSecondaryContainer, opacity: 0.9 }}
                  >
                    {house.subtitle}
                  </Text>
                ) : null}
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.primary, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {house.ctaLabel} →
                </Text>
              </View>
            </View>
          </Card.Content>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card
      mode={Platform.OS === "web" ? "outlined" : "elevated"}
      style={styles.card}
    >
      <Pressable onPress={onPress} accessibilityRole="button">
        <Card.Content style={styles.content}>
          <Chip compact mode="outlined" style={styles.partnerChipDefault}>
            Parceria
          </Chip>
          {house.imageUrl ? (
            <Image
              source={{ uri: house.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <View style={styles.textWrap}>
            <Text variant="titleMedium">{house.title}</Text>
            {house.subtitle ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {house.subtitle}
              </Text>
            ) : null}
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.primary, marginTop: 4 }}
            >
              {house.ctaLabel} →
            </Text>
          </View>
        </Card.Content>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16 },
  content: { gap: 10 },
  partnerChipDefault: { alignSelf: "flex-start" },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  textWrap: { gap: 4 },
  compactCard: { borderRadius: 14 },
  compactContent: { gap: 8, paddingVertical: 4 },
  partnerChip: { alignSelf: "flex-start", height: 24 },
  partnerChipText: { fontSize: 11, lineHeight: 14, marginVertical: 0 },
  compactRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  compactImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
  },
  compactTextWrap: { flex: 1, minWidth: 0, gap: 2 },
  compactTitle: { fontWeight: "600" },
});
