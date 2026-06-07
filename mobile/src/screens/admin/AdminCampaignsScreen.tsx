import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Chip, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import {
  adCampaignStatusLabel,
  adPlacementLabel,
  type AdCampaignStatus,
} from "../../constants/adCampaign";
import type { AdPlacementKey } from "../../constants/adPlacements";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminCampaigns">;

function statusChipColor(status: AdCampaignStatus, theme: ReturnType<typeof useTheme>) {
  switch (status) {
    case "ACTIVE":
      return theme.colors.primaryContainer;
    case "PAUSED":
      return theme.colors.errorContainer;
    default:
      return theme.colors.surfaceVariant;
  }
}

export function AdminCampaignsScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const listQ = trpc.ads.admin.list.useQuery(undefined, {
    enabled: user?.role === "ADMIN",
  });

  const deleteM = trpc.ads.admin.delete.useMutation({
    onSuccess: async () => {
      await utils.ads.admin.list.invalidate();
    },
  });

  const onRefresh = useCallback(() => {
    void listQ.refetch();
  }, [listQ]);

  const confirmDelete = (id: string, title: string) => {
    Alert.alert(
      "Excluir campanha",
      `Remover "${title}"? Os eventos de métricas permanecem sem vínculo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteM.mutate({ id }),
        },
      ]
    );
  };

  if (listQ.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (listQ.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 12, textAlign: "center" }}>
          {trpcErrorMessage(listQ.error)}
        </Text>
        <Button mode="contained" onPress={() => listQ.refetch()}>
          Tentar de novo
        </Button>
      </View>
    );
  }

  const campaigns = listQ.data ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 8 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={listQ.isFetching} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Campanhas
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Inventário house ads
            </Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => navigation.navigate("AdminCampaignForm", {})}
              style={styles.newBtn}
            >
              Nova campanha
            </Button>
          </View>
        }
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhuma campanha cadastrada.
          </Text>
        }
        renderItem={({ item }) => (
          <Card mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {item.title}
                </Text>
                <Chip
                  compact
                  style={{ backgroundColor: statusChipColor(item.status as AdCampaignStatus, theme) }}
                >
                  {adCampaignStatusLabel(item.status as AdCampaignStatus)}
                </Chip>
              </View>
              {item.subtitle ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.subtitle}
                </Text>
              ) : null}
              <Text variant="bodySmall" style={styles.meta}>
                Prioridade {item.priority} · CTR{" "}
                {item.stats.impressions > 0
                  ? `${Math.round((item.stats.clicks / item.stats.impressions) * 100)}%`
                  : "—"}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                {item.stats.impressions} impressões · {item.stats.clicks} cliques
              </Text>
              <View style={styles.chipRow}>
                {item.placements.map((p) => (
                  <Chip key={p} compact mode="outlined" style={styles.chip}>
                    {adPlacementLabel(p as AdPlacementKey)}
                  </Chip>
                ))}
              </View>
              <View style={styles.actions}>
                <Button
                  mode="contained-tonal"
                  icon="pencil-outline"
                  onPress={() =>
                    navigation.navigate("AdminCampaignForm", { campaignId: item.id })
                  }
                >
                  Editar
                </Button>
                <Button
                  mode="outlined"
                  icon="delete-outline"
                  textColor={theme.colors.error}
                  onPress={() => confirmDelete(item.id, item.title)}
                  loading={deleteM.isPending}
                >
                  Excluir
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      />
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, gap: 12 },
  header: { marginBottom: 8, gap: 8 },
  title: { fontWeight: "600" },
  newBtn: { alignSelf: "flex-start" },
  empty: { opacity: 0.8, marginTop: 24, textAlign: "center" },
  card: { borderRadius: 16 },
  cardContent: { gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontWeight: "600" },
  meta: { opacity: 0.85 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { alignSelf: "flex-start" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
