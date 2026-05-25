import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import {
  type ContractTime,
  formatMoneyWithContractPeriod,
} from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerVehicles">;

export function OwnerVehiclesScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const q = trpc.owner.listMyVehicles.useQuery();

  if (q.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 12, textAlign: "center" }}>
          {trpcErrorMessage(q.error)}
        </Text>
        <Button mode="contained" onPress={() => q.refetch()}>
          Tentar de novo
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 8 + insets.bottom },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => navigation.navigate("VehicleForm", {})}
            >
              Novo veículo
            </Button>
          </View>
        }
        renderItem={({ item }) => {
          const thumb = item.photos[0]?.photoUrl;
          return (
            <Pressable
              onPress={() =>
                navigation.navigate("VehicleForm", { vehicleId: item.id })
              }
            >
              <Card mode="elevated" style={styles.card}>
                <View style={styles.cardClip}>
                <View style={styles.cardRow}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPh]}>
                      <Text variant="labelSmall" style={styles.thumbPhT}>
                        Sem foto
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text variant="titleMedium">{item.title}</Text>
                    <Text variant="bodySmall" style={styles.meta}>
                      {item.plate} ·{" "}
                      {formatMoneyWithContractPeriod(
                        item.dailyRateCents,
                        (item as { contractTime?: ContractTime }).contractTime
                      )}
                    </Text>
                    <Text variant="bodySmall" style={styles.meta}>
                      {item.available ? "Disponível" : "Indisponível"}
                    </Text>
                  </View>
                </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
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
  list: { padding: 16, paddingBottom: 12 },
  header: { marginBottom: 16, gap: 12 },
  card: { marginBottom: 12, borderRadius: 16 },
  cardClip: { borderRadius: 16, overflow: "hidden" },
  cardRow: { flexDirection: "row" },
  thumb: { width: 96, height: 96, backgroundColor: "#f1f5f9" },
  thumbPh: { justifyContent: "center", alignItems: "center" },
  thumbPhT: { fontSize: 11, color: "#94a3b8" },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  meta: { marginTop: 4, opacity: 0.85 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
