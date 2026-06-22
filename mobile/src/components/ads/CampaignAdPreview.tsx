import { Platform, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import {
  adPlacementLabel,
  type AdPlacementKey,
} from "../../constants/adCampaign";
import { HouseAdCard, type HouseAdPayload, type HouseAdVariant } from "./HouseAdCard";

export type CampaignPreviewFields = {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  clickUrl: string;
  placements: AdPlacementKey[];
};

const PREVIEW_PLACEMENT_ORDER: AdPlacementKey[] = [
  "DRIVER_HOME",
  "MARKETPLACE_LIST",
];

function variantForPlacement(placement: AdPlacementKey): HouseAdVariant {
  return placement === "DRIVER_HOME" ? "compact" : "default";
}

function adPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

function buildPreviewPayload(fields: CampaignPreviewFields): HouseAdPayload {
  return {
    campaignId: "preview",
    title: fields.title.trim() || "Título da campanha",
    subtitle: fields.subtitle.trim() || null,
    imageUrl: fields.imageUrl.trim() || null,
    ctaLabel: fields.ctaLabel.trim() || "Saiba mais",
    clickUrl: fields.clickUrl.trim() || "#",
  };
}

type Props = {
  form: CampaignPreviewFields;
};

export function CampaignAdPreview({ form }: Props) {
  const theme = useTheme();
  const platform = adPlatform();
  const house = buildPreviewPayload(form);

  const placements = PREVIEW_PLACEMENT_ORDER.filter((p) =>
    form.placements.includes(p)
  );

  return (
    <View style={styles.wrap}>
      <Text variant="labelLarge" style={styles.heading}>
        Pré-visualização
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Como o anúncio aparece no app. Métricas não são registradas no preview.
      </Text>

      {placements.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Selecione ao menos um placement para ver o preview.
        </Text>
      ) : (
        placements.map((placement) => (
          <View key={placement} style={styles.block}>
            <Text variant="labelMedium" style={styles.placementLabel}>
              {adPlacementLabel(placement)}
            </Text>
            <HouseAdCard
              preview
              placement={placement}
              platform={platform}
              variant={variantForPlacement(placement)}
              house={house}
            />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 8, marginBottom: 8 },
  heading: { marginTop: 4 },
  block: { gap: 6 },
  placementLabel: { opacity: 0.85 },
});
