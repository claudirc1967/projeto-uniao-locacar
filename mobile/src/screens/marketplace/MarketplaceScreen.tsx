import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { formatMoneyWithContractPeriod } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Marketplace">;

export function MarketplaceScreen({ navigation }: Props) {
  const { user } = useAuth();
  const q = trpc.marketplace.listAvailableVehicles.useQuery();

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{trpcErrorMessage(q.error)}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.title}>Veículos disponíveis</Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Nenhum veículo listado.</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("VehicleDetail", { vehicleId: item.id })
          }
        >
          {item.coverPhotoUrl ? (
            <Image source={{ uri: item.coverPhotoUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.ph]}>
              <Text style={styles.phT}>Sem foto</Text>
            </View>
          )}
          <View style={styles.body}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {formatMoneyWithContractPeriod(
                item.dailyRateCents,
                item.contractTime
              )}
            </Text>
            <Text style={styles.meta}>Modelo: {item.model ?? "—"}</Text>
            <Text style={styles.meta}>Ano: {item.year ?? "—"}</Text>
            <Text style={styles.meta}>Cor: {item.cor ?? "—"}</Text>
            {item.pickupCity ? (
              <Text style={styles.meta}>
                {item.pickupCity}
                {item.pickupUf ? `/${item.pickupUf}` : ""}
              </Text>
            ) : null}
            {user?.role === "DRIVER" && item.driverRequestBlocked ? (
              <Text style={styles.blockedTag}>Solicitação bloqueada</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  cover: { width: 110, height: 110, backgroundColor: "#f1f5f9" },
  ph: { justifyContent: "center", alignItems: "center" },
  phT: { fontSize: 12, color: "#94a3b8" },
  body: { flex: 1, padding: 12, justifyContent: "center" },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  meta: { color: "#64748b", marginTop: 4 },
  empty: { color: "#94a3b8", marginTop: 24 },
  err: { color: "#dc2626", textAlign: "center" },
  blockedTag: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#b45309",
  },
});
