import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Icon, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import type { RootStackParamList } from "../../navigation/types";
import { formatDateDisplay } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "UserReviews">;

type ReviewItem = {
  id: string;
  rentalId: string;
  vehicleTitle: string;
  stars: number;
  tags: string[];
  comment: string | null;
  createdAt: Date | string;
};

function countLabel(count: number) {
  return count === 1 ? "1 avaliação" : `${count} avaliações`;
}

function StarsRow({ stars }: { stars: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          source={stars >= n ? "star" : "star-outline"}
          size={20}
          color={stars >= n ? "#f59e0b" : "#cbd5e1"}
        />
      ))}
    </View>
  );
}

export function UserReviewsScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { targetUserId, targetRole, displayName } = route.params;
  const isOwnerTarget = targetRole === "OWNER";

  const ownerReviewsQ = trpc.marketplace.listOwnerReviews.useQuery(
    { ownerUserId: targetUserId },
    { enabled: isOwnerTarget }
  );
  const driverReviewsQ = trpc.owner.listDriverReviews.useQuery(
    { driverUserId: targetUserId },
    { enabled: !isOwnerTarget }
  );

  const isLoading = isOwnerTarget
    ? ownerReviewsQ.isLoading
    : driverReviewsQ.isLoading;
  const error = isOwnerTarget ? ownerReviewsQ.error : driverReviewsQ.error;
  const data = isOwnerTarget ? ownerReviewsQ.data : driverReviewsQ.data;
  const summary = data?.summary;
  const items: ReviewItem[] = data?.items ?? [];

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {trpcErrorMessage(error)}
        </Text>
        <Button
          mode="outlined"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.errorBackBtn}
        >
          Voltar
        </Button>
      </View>
    );
  }

  const ratingCount = summary?.ratingCount ?? 0;
  const headerName =
    summary?.displayName?.trim() ||
    displayName?.trim() ||
    (targetRole === "OWNER" ? "Locador" : "Motorista");

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 8 + insets.bottom },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineSmall">{headerName}</Text>
            {ratingCount > 0 && summary?.averageRating != null ? (
              <>
                <Text variant="headlineMedium" style={styles.summaryRating}>
                  ★ {summary.averageRating.toFixed(1).replace(".", ",")}
                </Text>
                <Text variant="bodyMedium" style={styles.summaryCount}>
                  {countLabel(ratingCount)}
                </Text>
                <Text variant="bodySmall" style={styles.summaryHint}>
                  Avaliações mais recentes recebidas nesta plataforma.
                </Text>
              </>
            ) : (
              <Text variant="bodyMedium" style={styles.emptyHeader}>
                Sem avaliações ainda.
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          ratingCount > 0 ? (
            <Text variant="bodyMedium" style={styles.emptyList}>
              Nenhum detalhe de avaliação disponível.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card mode="outlined" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <StarsRow stars={item.stars} />
                <Text variant="bodySmall" style={styles.dateText}>
                  {formatDateDisplay(item.createdAt)}
                </Text>
              </View>
              <Text variant="labelLarge" style={styles.vehicleTitle}>
                {item.vehicleTitle}
              </Text>
              {item.tags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {item.tags.map((tag) => (
                    <Chip key={`${item.id}-${tag}`} compact style={styles.tagChip}>
                      {tag}
                    </Chip>
                  ))}
                </View>
              ) : null}
              {item.comment?.trim() ? (
                <Text variant="bodyMedium" style={styles.comment}>
                  {item.comment.trim()}
                </Text>
              ) : null}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorBackBtn: { marginTop: 12 },
  list: { padding: 16, paddingBottom: 12 },
  header: { marginBottom: 16 },
  summaryRating: { marginTop: 8 },
  summaryCount: { marginTop: 2, opacity: 0.9 },
  summaryHint: { marginTop: 6, opacity: 0.75 },
  emptyHeader: { marginTop: 10, opacity: 0.8 },
  emptyList: { marginTop: 4, opacity: 0.75 },
  card: { marginBottom: 12, borderRadius: 16 },
  cardContent: { gap: 10 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  starsRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  dateText: { opacity: 0.75 },
  vehicleTitle: { lineHeight: 20 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { marginVertical: 2 },
  comment: { lineHeight: 21, opacity: 0.92 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
