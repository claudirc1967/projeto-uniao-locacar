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
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { formatMoneyWithContractPeriod } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Marketplace">;

export function MarketplaceScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const q = trpc.marketplace.listAvailableVehicles.useQuery();

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
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {trpcErrorMessage(q.error)}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(i) => i.id}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text variant="headlineSmall" style={styles.header}>
          Veículos disponíveis
        </Text>
      }
      ListEmptyComponent={
        <Text variant="bodyMedium" style={styles.empty}>
          Nenhum veículo listado.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            navigation.navigate("VehicleDetail", { vehicleId: item.id })
          }
        >
          <Card mode="elevated" style={styles.card}>
            <View style={styles.row}>
              {item.coverPhotoUrl ? (
                <Image source={{ uri: item.coverPhotoUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.ph]}>
                  <Text variant="labelSmall" style={styles.phT}>
                    Sem foto
                  </Text>
                </View>
              )}
              <View style={styles.body}>
                <Text variant="titleMedium">{item.title}</Text>
                <Text variant="bodySmall" style={styles.meta}>
                  {formatMoneyWithContractPeriod(
                    item.dailyRateCents,
                    item.contractTime
                  )}
                </Text>
                <Text variant="bodySmall" style={styles.meta}>
                  Modelo: {item.model ?? "—"}
                </Text>
                <Text variant="bodySmall" style={styles.meta}>
                  Ano: {item.year ?? "—"}
                </Text>
                <Text variant="bodySmall" style={styles.meta}>
                  Cor: {item.cor ?? "—"}
                </Text>
                {item.pickupCity ? (
                  <Text variant="bodySmall" style={styles.meta}>
                    {item.pickupCity}
                    {item.pickupUf ? `/${item.pickupUf}` : ""}
                  </Text>
                ) : null}
                {user?.role === "DRIVER" && item.driverRequestBlocked ? (
                  <Text variant="labelSmall" style={styles.blockedTag}>
                    Solicitação bloqueada
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        </Pressable>
      )}
      ListFooterComponent={
        <Button mode="text" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  card: { marginBottom: 12, borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row" },
  cover: { width: 110, height: 110, backgroundColor: "#f1f5f9" },
  ph: { justifyContent: "center", alignItems: "center" },
  phT: { color: "#94a3b8" },
  body: { flex: 1, padding: 12, justifyContent: "center" },
  meta: { marginTop: 4, opacity: 0.85 },
  empty: { marginTop: 24, opacity: 0.7 },
  blockedTag: {
    marginTop: 8,
    fontWeight: "600",
    color: "#b45309",
  },
});
