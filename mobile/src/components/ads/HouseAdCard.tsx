import { useEffect, useRef } from "react";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
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

type Props = {
  placement: AdPlacementKey;
  platform: "ios" | "android" | "web";
  house: HouseAdPayload;
};

export function HouseAdCard({ placement, platform, house }: Props) {
  const theme = useTheme();
  const impressionSent = useRef(false);
  const track = trpc.ads.track.useMutation();

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

  return (
    <Card mode="elevated" style={styles.card}>
      <Pressable onPress={onPress} accessibilityRole="button">
        <Card.Content style={styles.content}>
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
  content: { gap: 12 },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  textWrap: { gap: 4 },
});
